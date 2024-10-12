type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea" | "json";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type Operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

/**
 * This list of operations is used to generate the manual testing UI.
 */
const operations: Operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update Password",
    endpoint: "/api/users/password",
    method: "PATCH",
    fields: { currentPassword: "input", newPassword: "input" },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Get Posts (empty for all)",
    endpoint: "/api/posts",
    method: "GET",
    fields: { author: "input" },
  },
  {
    name: "Create Post",
    endpoint: "/api/posts",
    method: "POST",
    fields: { content: "input" },
  },
  {
    name: "Update Post",
    endpoint: "/api/posts/:id",
    method: "PATCH",
    fields: { id: "input", content: "input", options: { backgroundColor: "input" } },
  },
  {
    name: "Delete Post",
    endpoint: "/api/posts/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Get Comments by User (empty for all users)",
    endpoint: "/api/comments",
    method: "GET",
    fields: { author: "input" },
  },
  {
    name: "Get Comments by Parent",
    endpoint: "/api/comments/:parent",
    method: "GET",
    fields: { parent: "input" },
  },
  {
    name: "Create Comment",
    endpoint: "/api/comments",
    method: "POST",
    fields: { content: "input", parent: "input" },
  },
  {
    name: "Update Comment",
    endpoint: "/api/comments/:id",
    method: "PATCH",
    fields: { id: "input", content: "input" },
  },
  {
    name: "Delete Comment",
    endpoint: "/api/comments/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Get Groups by User (or all groups if empty)",
    endpoint: "/api/groups",
    method: "GET",
    fields: { member: "input" },
  },
  {
    name: "Get Groups by Founder",
    endpoint: "/api/groups/:founder",
    method: "GET",
    fields: { founder: "input" },
  },
  {
    name: "Create Group",
    endpoint: "/api/groups",
    method: "POST",
    fields: { name: "input" },
  },
  {
    name: "Add Content to Group",
    endpoint: "/api/groups/:id",
    method: "PATCH",
    fields: { id: "input", contentId: "input" },
  },
  {
    name: "Remove Content from Group",
    endpoint: "/api/groups/:id/remove",
    method: "PATCH",
    fields: { id: "input", contentId: "input" },
  },
  {
    name: "Join Group",
    endpoint: "/api/groups/:id/join",
    method: "PATCH",
    fields: { id: "input" },
  },
  {
    name: "Leave Group",
    endpoint: "/api/groups/:id/leave",
    method: "PATCH",
    fields: { id: "input" },
  },
  {
    name: "Delete Group",
    endpoint: "/api/groups/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Request Accountability Partner",
    endpoint: "/api/matches/request",
    method: "POST",
    fields: {},
  },
  {
    name: "Get Matching Status",
    endpoint: "/api/matches",
    method: "GET",
    fields: {},
  },
  {
    name: "Get Matched Users",
    endpoint: "/api/matches/all",
    method: "GET",
    fields: {},
  },
  {
    name: "Get Unmatched Users",
    endpoint: "/api/matches/unmatched",
    method: "GET",
    fields: {},
  },
  {
    name: "Delete Match",
    endpoint: "/api/matches",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Remove User from Matching Pool",
    endpoint: "/api/matches/user",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Share Goal with Match",
    endpoint: "/api/matches/goal",
    method: "PUT",
    fields: { goal: "input" },
  },
  {
    name: "Update Goal",
    endpoint: "/api/matches/goal",
    method: "PATCH",
    fields: { oldGoal: "input", newGoal: "input" },
  },
  {
    name: "Remove Goal",
    endpoint: "/api/matches/goal",
    method: "DELETE",
    fields: { goal: "input" },
  },
  {
    name: "Get Goals",
    endpoint: "/api/matches/goal",
    method: "GET",
    fields: {},
  },
  {
    name: "Get Partner Goals",
    endpoint: "/api/matches/goal/partner",
    method: "GET",
    fields: {},
  },
  {
    name: "Get Events",
    endpoint: "/api/events",
    method: "GET",
    fields: {},
  },
  {
    name: "Get Event",
    endpoint: "/api/events/:id",
    method: "GET",
    fields: { id: "input" },
  },
  {
    name: "Create Event",
    endpoint: "/api/events",
    method: "POST",
    fields: { eventName: "input", group: "input", time: "input", location: "input" },
  },
  {
    name: "Join Event",
    endpoint: "/api/events/:id/join",
    method: "PATCH",
    fields: { id: "input" },
  },
  {
    name: "Leave Event",
    endpoint: "/api/events/:id/leave",
    method: "PATCH",
    fields: { id: "input" },
  },
  {
    name: "Delete Event",
    endpoint: "/api/events/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Update Name",
    endpoint: "/api/events/:id/name",
    method: "PATCH",
    fields: { id: "input", name: "input" },
  },
  {
    name: "Vote on Time",
    endpoint: "/api/events/:id/time/vote",
    method: "POST",
    fields: { id: "input", time: "input" },
  },
  {
    name: "Unvote on Time",
    endpoint: "/api/events/:id/time/vote",
    method: "DELETE",
    fields: { id: "input", time: "input" },
  },
  {
    name: "Unvote on Location",
    endpoint: "/api/events/:id/location/vote",
    method: "DELETE",
    fields: { id: "input", location: "input" },
  },
  {
    name: "Vote on Location",
    endpoint: "/api/events/:id/location/vote",
    method: "POST",
    fields: { id: "input", location: "input" },
  },
  {
    name: "Add Possible Time",
    endpoint: "/api/events/:id/time",
    method: "POST",
    fields: { id: "input", time: "input" },
  },
  {
    name: "Remove Possible Time",
    endpoint: "/api/events/:id/time",
    method: "DELETE",
    fields: { id: "input", time: "input" },
  },
  {
    name: "Add Possible Location",
    endpoint: "/api/events/:id/location",
    method: "POST",
    fields: { id: "input", location: "input" },
  },
  {
    name: "Remove Possible Location",
    endpoint: "/api/events/:id/location",
    method: "DELETE",
    fields: { id: "input", location: "input" },
  },
  {
    name: "Get User Votes",
    endpoint: "/api/events/:id/votes",
    method: "GET",
    fields: { id: "input", user: "input" },
  },
  {
    name: "Get Attendees",
    endpoint: "/api/events/:id/attendees",
    method: "GET",
    fields: { id: "input" },
  },
  {
    name: "Get All Votes",
    endpoint: "/api/events/:id/allVotes",
    method: "GET",
    fields: { id: "input" },
  },
];

/*
 * You should not need to edit below.
 * Please ask if you have questions about what this test code is doing!
 */

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      const htmlTag = tag === "json" ? "textarea" : tag;
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${htmlTag} name="${prefix}${name}"></${htmlTag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const op = operations.find((op) => op.endpoint === $endpoint && op.method === $method);
  const pairs = Object.entries(reqData);
  for (const [key, val] of pairs) {
    if (val === "") {
      delete reqData[key];
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = key.split(".").reduce((obj, key) => obj[key], op?.fields as any);
    if (type === "json") {
      reqData[key] = JSON.parse(val as string);
    }
  }

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
