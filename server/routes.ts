import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Commenting, Friending, Grouping, Posting, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/comments")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getComments(author?: string) {
    let comments;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      comments = await Commenting.getByAuthor(id);
    } else {
      comments = await Commenting.getComments();
    }
    return Responses.comments(comments);
  }
  @Router.get("/comments/:parent")
  async getCommentsByParent(parent: string) {
    const parentOid = new ObjectId(parent);
    try {
      await Posting.assertPostExists(parentOid);
    } catch {
      await Commenting.assertCommentExists(parentOid);
    }
    return Responses.comments(await Commenting.getByParent(parentOid));
  }
  @Router.post("/comments")
  async createComment(session: SessionDoc, content: string, parent: string) {
    const user = Sessioning.getUser(session);
    const parentOid = new ObjectId(parent);
    try {
      await Posting.assertPostExists(parentOid);
    } catch {
      await Commenting.assertCommentExists(parentOid);
    }
    const created = await Commenting.create(user, content, parentOid);
    return { msg: created.msg, comment: await Responses.comment(created.comment) };
  }
  @Router.patch("/comments/:id")
  async updateComment(session: SessionDoc, id: string, content?: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Commenting.assertAuthorIsUser(oid, user);
    return await Commenting.update(oid, content);
  }
  @Router.delete("/comments/:id")
  async deleteComment(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Commenting.assertAuthorIsUser(oid, user);
    return Commenting.delete(oid);
  }

  @Router.get("/groups")
  @Router.validate(z.object({ member: z.string().optional() }))
  async getGroups(member?: string) {
    let groups;
    if (member) {
      const id = (await Authing.getUserByUsername(member))._id;
      groups = await Grouping.getByMembership(id);
    } else {
      groups = await Grouping.getCommunities();
    }
    return Responses.groups(groups);
  }

  @Router.get("/groups/:founder")
  async getGroupsByFounder(founder: string) {
    const founderOid = (await Authing.getUserByUsername(founder))._id;
    let groups = await Grouping.getByFounder(founderOid);
    return Responses.groups(groups);
  }

  @Router.post("/groups/")
  async createGroup(session: SessionDoc, name: string) {
    const user = Sessioning.getUser(session);
    const founderOid = new ObjectId(user);
    const created = await Grouping.create(name, founderOid);
    return { msg: created.msg, group: await Responses.group(created.group) };
  }

  @Router.patch("/groups/:id")
  async addContentToGroup(session: SessionDoc, id: string, contentId: ObjectId) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    return await Grouping.addContent(user, groupOid, contentId);
  }

  @Router.patch("/groups/:id/remove")
  async removeContentFromGroup(session: SessionDoc, id: string, contentId: ObjectId) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    return await Grouping.removeContent(user, groupOid, contentId);
  }

  @Router.patch("/groups/:id/join")
  async joinGroup(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    return await Grouping.joinCommunity(user, groupOid);
  }

  @Router.patch("/groups/:id/leave")
  async leaveGroup(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    return await Grouping.leaveCommunity(user, groupOid);
  }

  @Router.delete("/groups/:id")
  async deleteGroup(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    await Grouping.assertUserIsFounder(user, groupOid);
    return await Grouping.deleteCommunity(user, groupOid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  @Router.put("/matching/request")
  async requestPartner(session: SessionDoc) {
    // TODO: Implement this route
  }

  @Router.put("/matching/accept/:from")
  async acceptPartner(session: SessionDoc, from: string) {
    // TODO: Implement this route
  }

  @Router.put("/matching/shareGoals")
  async shareGoals(session: SessionDoc, goals: string[]) {
    // TODO: Implement this route
  }

  @Router.put("/matching/message/:to")
  async sendMessage(session: SessionDoc, to: string, message: string) {
    // TODO: Implement this route (stretch)
  }

  @Router.post("scheduling/:id")
  async createEvent(session: SessionDoc, group: ObjectId, time: string, location: string, id: string, eventName: string) {
    // TODO: Implement this route
  }

  @Router.patch("scheduling/:id/join")
  async joinEvent(session: SessionDoc, id: string) {
    // TODO: Implement this route
  }

  @Router.patch("scheduling/:id/leave")
  async leaveEvent(session: SessionDoc, id: string) {
    // TODO: Implement this route
  }

  @Router.delete("scheduling/:id")
  async deleteEvent(session: SessionDoc, id: string) {
    // TODO: Implement this route
  }

  @Router.patch("scheduling/:id/voteTime")
  async voteTime(session: SessionDoc, id: string, time: string) {
    // TODO: Implement this route
  }

  @Router.patch("scheduling/:id/voteLocation")
  async voteLocation(session: SessionDoc, id: string, location: string) {
    // TODO: Implement this route
  }

  @Router.put("scheduling/:id/notify")
  async notifyUsers(session: SessionDoc, id: string) {
    // TODO: Implement this route (stretch)
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
