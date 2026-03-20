import { PrismaClient, User } from '@prisma/client';
import { faker } from '@faker-js/faker';

export async function createConversations(
  prisma: PrismaClient,
  users: User[],
  conversationsCount: number = 5
) {
  const createdConversations = [];
  const conversationPairs = new Set<string>();

  // Create conversations between random user pairs
  for (let i = 0; i < conversationsCount && i < users.length * (users.length - 1) / 2; i++) {
    const [user1, user2] = faker.helpers.arrayElements(users, 2);

    // Create a unique key for this pair
    const pairKey = [user1.id, user2.id].sort().join('-');

    // Skip if we already have a conversation for this pair
    if (conversationPairs.has(pairKey)) {
      continue;
    }
    conversationPairs.add(pairKey);

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: user1.id },
            { userId: user2.id },
          ],
        },
      },
      include: {
        participants: true,
      },
    });

    // Create messages in the conversation
    const messageCount = faker.number.int({ min: 3, max: 15 });
    const messages = [];

    for (let j = 0; j < messageCount; j++) {
      const sender = faker.datatype.boolean() ? user1 : user2;
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content: generateMessageContent(),
          createdAt: faker.date.recent({ days: 7 }),
          readAt: faker.datatype.boolean({ probability: 0.7 })
            ? faker.date.recent({ days: 2 })
            : null,
        },
      });
      messages.push(message);
    }

    // Update conversation's lastMessageAt
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: lastMessage.createdAt },
      });
    }

    createdConversations.push(conversation);
  }

  return createdConversations;
}

function generateMessageContent(): string {
  const messageTemplates = [
    "Hey! How are you doing?",
    "What's up?",
    "Long time no see!",
    "How have you been?",
    "Did you see that post?",
    "That's awesome!",
    "Thanks for sharing!",
    "Let's catch up soon!",
    "Are you free this weekend?",
    "Great to hear from you!",
    "I totally agree!",
    "That's hilarious! 😂",
    "Sure, sounds good!",
    "Looking forward to it!",
    "Take care!",
    faker.lorem.sentence(),
    faker.lorem.sentences(2),
  ];

  return faker.helpers.arrayElement(messageTemplates);
}

export async function createSampleConversation(
  prisma: PrismaClient,
  user1: User,
  user2: User
) {
  // Create a specific conversation for demo purposes
  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: user1.id },
          { userId: user2.id },
        ],
      },
    },
  });

  // Create a realistic conversation flow
  const messages = [
    { sender: user1, content: "Hey! Welcome to Mega Facebook! 👋" },
    { sender: user2, content: "Thanks! Happy to be here. The platform looks great!" },
    { sender: user1, content: "Feel free to explore and let me know if you have any questions." },
    { sender: user2, content: "Will do! I'm impressed with all the features." },
    { sender: user1, content: "We're constantly adding new things. Stay tuned! 🚀" },
  ];

  let previousTime = faker.date.recent({ days: 2 });
  for (const msgData of messages) {
    // Each message is a few minutes after the previous one
    const createdAt = new Date(previousTime.getTime() + faker.number.int({ min: 60000, max: 300000 }));

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: msgData.sender.id,
        content: msgData.content,
        createdAt,
        readAt: createdAt, // Mark all as read for demo
      },
    });

    previousTime = createdAt;
  }

  // Update conversation's lastMessageAt
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: previousTime },
  });

  return conversation;
}