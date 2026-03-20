import {
  PrismaClient,
  User,
  Post,
  ReactionType,
  ReactionTargetType,
  Comment
} from '@prisma/client';
import { faker } from '@faker-js/faker';

const reactionTypes = [
  ReactionType.LIKE,
  ReactionType.LOVE,
  ReactionType.HAHA,
  ReactionType.WOW,
  ReactionType.SAD,
  ReactionType.ANGRY,
];

export async function createReactions(
  prisma: PrismaClient,
  users: User[],
  posts: Post[],
  reactionProbability: number = 0.3
) {
  const createdReactions = [];

  for (const post of posts) {
    // Random subset of users react to each post
    const reactingUsers = users
      .filter(() => faker.datatype.boolean({ probability: reactionProbability }))
      .filter(user => user.id !== post.authorId); // Don't react to own posts

    for (const user of reactingUsers) {
      try {
        const reaction = await prisma.reaction.create({
          data: {
            userId: user.id,
            targetType: ReactionTargetType.POST,
            targetId: post.id,
            type: faker.helpers.arrayElement(reactionTypes),
          },
        });
        createdReactions.push(reaction);
      } catch (error) {
        // Skip if reaction already exists (unique constraint)
      }
    }
  }

  return createdReactions;
}

export async function createComments(
  prisma: PrismaClient,
  users: User[],
  posts: Post[],
  commentProbability: number = 0.2
) {
  const createdComments = [];
  const commentTexts = [
    "Great post! Thanks for sharing.",
    "Totally agree with this!",
    "Interesting perspective 🤔",
    "Love this! 😍",
    "Thanks for sharing your thoughts.",
    "This is so true!",
    "Couldn't agree more!",
    "Well said! 👏",
    "This made my day!",
    "Awesome content!",
    "Very insightful.",
    "Thanks for the inspiration!",
  ];

  for (const post of posts) {
    // Random subset of users comment on each post
    const commentingUsers = users
      .filter(() => faker.datatype.boolean({ probability: commentProbability }));

    for (const user of commentingUsers) {
      const comment = await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: user.id,
          content: faker.helpers.arrayElement(commentTexts) +
                   (faker.datatype.boolean({ probability: 0.3 })
                    ? ' ' + faker.lorem.sentence()
                    : ''),
        },
      });
      createdComments.push(comment);

      // Sometimes create replies to comments
      if (faker.datatype.boolean({ probability: 0.3 })) {
        const replyingUser = faker.helpers.arrayElement(users);
        const reply = await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: replyingUser.id,
            parentId: comment.id,
            content: faker.helpers.arrayElement([
              "I agree!",
              "Good point!",
              "Thanks for your comment!",
              "Exactly what I was thinking!",
              "Well said!",
            ]),
          },
        });
        createdComments.push(reply);
      }
    }
  }

  return createdComments;
}

export async function createCommentReactions(
  prisma: PrismaClient,
  users: User[],
  comments: Comment[],
  reactionProbability: number = 0.15
) {
  const createdReactions = [];

  for (const comment of comments) {
    const reactingUsers = users
      .filter(() => faker.datatype.boolean({ probability: reactionProbability }))
      .filter(user => user.id !== comment.authorId);

    for (const user of reactingUsers) {
      try {
        const reaction = await prisma.reaction.create({
          data: {
            userId: user.id,
            targetType: ReactionTargetType.COMMENT,
            targetId: comment.id,
            type: faker.helpers.arrayElement([
              ReactionType.LIKE,
              ReactionType.LOVE,
              ReactionType.HAHA,
            ]),
          },
        });
        createdReactions.push(reaction);
      } catch (error) {
        // Skip if reaction already exists
      }
    }
  }

  return createdReactions;
}