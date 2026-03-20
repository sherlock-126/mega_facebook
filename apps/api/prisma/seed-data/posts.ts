import { PrismaClient, PostVisibility, User } from '@prisma/client';
import { faker } from '@faker-js/faker';

export async function createPosts(
  prisma: PrismaClient,
  users: User[],
  postsPerUser: number = 3
) {
  const createdPosts = [];

  for (const user of users) {
    for (let i = 0; i < postsPerUser; i++) {
      // Generate random content
      const hasImage = faker.datatype.boolean({ probability: 0.6 });
      const imageCount = hasImage ? faker.number.int({ min: 1, max: 4 }) : 0;

      const postData = {
        authorId: user.id,
        content: faker.lorem.paragraphs({ min: 1, max: 3 }),
        visibility: faker.helpers.arrayElement([
          PostVisibility.PUBLIC,
          PostVisibility.PUBLIC,
          PostVisibility.FRIENDS_ONLY,
        ]),
        createdAt: faker.date.recent({ days: 30 }),
      };

      const post = await prisma.post.create({
        data: postData,
      });

      // Create post images if needed
      if (imageCount > 0) {
        const imagePromises = [];
        for (let j = 0; j < imageCount; j++) {
          imagePromises.push(
            prisma.postImage.create({
              data: {
                postId: post.id,
                url: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
                sortOrder: j,
              },
            })
          );
        }
        await Promise.all(imagePromises);
      }

      createdPosts.push(post);
    }
  }

  return createdPosts;
}

export async function createSamplePosts(prisma: PrismaClient, users: User[]) {
  const sampleContent = [
    {
      content: "Just launched our new social platform! 🚀 Excited to connect with everyone here.",
      visibility: PostVisibility.PUBLIC,
    },
    {
      content: "Beautiful sunset today! Nature never fails to amaze me. What's your favorite time of day?",
      visibility: PostVisibility.PUBLIC,
    },
    {
      content: "Working on some exciting new features. Can't wait to share them with you all soon! #coding #development",
      visibility: PostVisibility.FRIENDS_ONLY,
    },
    {
      content: "Coffee and code - the perfect combination for a productive morning. How do you start your day?",
      visibility: PostVisibility.PUBLIC,
    },
    {
      content: "Just finished reading an amazing book on system design. Any recommendations for what to read next?",
      visibility: PostVisibility.PUBLIC,
    },
    {
      content: "Weekend vibes! Time to relax and recharge. What are your weekend plans?",
      visibility: PostVisibility.FRIENDS_ONLY,
    },
    {
      content: "Technology is evolving so fast! What tech trend are you most excited about?",
      visibility: PostVisibility.PUBLIC,
    },
    {
      content: "Grateful for all the amazing connections I've made here. You all inspire me every day!",
      visibility: PostVisibility.PUBLIC,
    },
  ];

  const createdPosts = [];

  for (let i = 0; i < Math.min(users.length, sampleContent.length); i++) {
    const user = users[i];
    const content = sampleContent[i];

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        content: content.content,
        visibility: content.visibility,
        createdAt: faker.date.recent({ days: 7 }),
      },
    });

    // Add images to some posts
    if (i % 2 === 0) {
      await prisma.postImage.create({
        data: {
          postId: post.id,
          url: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
          sortOrder: 0,
        },
      });
    }

    createdPosts.push(post);
  }

  return createdPosts;
}