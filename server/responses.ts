import { ObjectId } from "mongodb";
import { Authing, Posting } from "./app";
import { CommentAuthorNotMatchError, CommentDoc } from "./concepts/commenting";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friending";
import { GroupingDoc } from "./concepts/grouping";
import { MatchingDoc, UserMatchStatusDoc } from "./concepts/matching";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/posting";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link PostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert PostDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    const author = await Authing.getUserById(post.author);
    return { ...post, author: author.username };
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const authors = await Authing.idsToUsernames(posts.map((post) => post.author));
    return posts.map((post, i) => ({ ...post, author: authors[i] }));
  }

  /**
   * Convert CommentDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async comment(comment: CommentDoc | null) {
    if (!comment) {
      return comment;
    }
    const author = await Authing.getUserById(comment.author);
    return { ...comment, author: author.username };
  }
  /**
   * Same as {@link comment} but for an array of CommentDoc for improved performance.
   */
  static async comments(comments: CommentDoc[]) {
    const authors = await Authing.idsToUsernames(comments.map((comment) => comment.author));
    return comments.map((comment, i) => ({ ...comment, author: authors[i] }));
  }

  /**
   * Convert GroupDoc into more readable format for the frontend by converting the content ids into their actual content
   * (currently strings) as well as founders and members into usernames
   */
  static async group(group: GroupingDoc | null) {
    if (!group) {
      return group;
    }
    const founder = await Authing.getUserById(group.founder);
    const members = await Authing.idsToUsernames(group.members);
    const content = await Promise.all(
      group.content.map(async (contentId) => {
        const post = await Posting.getById(new ObjectId(contentId));
        return post;
      }),
    );
    return { ...group, founder: founder.username, members: members, content: content };
  }

  /**
   * Same as {@link group} but for an array of GroupingDoc for improved performance.
   */
  static async groups(groups: GroupingDoc[]) {
    const founders = await Authing.idsToUsernames(groups.map((group) => group.founder));
    const members = await Promise.all(groups.map((group) => Authing.idsToUsernames(group.members)));
    const contents = await Promise.all(
      groups.map(
        async (group) =>
          await Promise.all(
            group.content.map(async (contentId) => {
              const post = await Posting.getById(new ObjectId(contentId));
              return post;
            }),
          ),
      ),
    );
    return groups.map((group, i) => ({ ...group, founder: founders[i], members: members[i], content: contents[i] }));
  }

  /**
   *  Convert MatchingDoc into more readable format for the frontend by converting the ids into usernames.
   */
  static async match(match: MatchingDoc | null) {
    if (!match) {
      return match;
    }
    const user1 = await Authing.getUserById(match.user1);
    const user2 = await Authing.getUserById(match.user2);
    return { ...match, user1: user1.username, user2: user2.username };
  }

  /**
   * Same as {@link match} but for an array of MatchingDoc for improved performance.
   */
  static async matches(matches: MatchingDoc[]) {
    const user1s = await Authing.idsToUsernames(matches.map((match) => match.user1));
    const user2s = await Authing.idsToUsernames(matches.map((match) => match.user2));
    return matches.map((match, i) => ({ ...match, user1: user1s[i], user2: user2s[i] }));
  }

  /**
   * Gets usernames for users in unmatched pool
   */
  static async unmatchedPool(pool: UserMatchStatusDoc[]) {
    const usernames = await Authing.idsToUsernames(pool.map((user) => user.user));
    return pool.map((user, i) => ({ ...user, user: usernames[i] }));
  }

  /**
   * Convert FriendRequestDoc into more readable format for the frontend
   * by converting the ids into usernames.
   */
  static async friendRequests(requests: FriendRequestDoc[]) {
    const from = requests.map((request) => request.from);
    const to = requests.map((request) => request.to);
    const usernames = await Authing.idsToUsernames(from.concat(to));
    return requests.map((request, i) => ({ ...request, from: usernames[i], to: usernames[i + requests.length] }));
  }
}

Router.registerError(PostAuthorNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(CommentAuthorNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(FriendRequestAlreadyExistsError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.from), Authing.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.user1), Authing.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendRequestNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.from), Authing.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(AlreadyFriendsError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.user1), Authing.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});
