import {
  UserProvider,
  User,
  GetUser,
  ListUser,
  CreateUser,
  DeleteUser,
  UpdateUser,
  IdentityPluginError,
} from "@stamp-lib/stamp-types/pluginInterface/identity";
import { okAsync, errAsync } from "neverthrow";
import { some, none } from "@stamp-lib/stamp-option";

const UserMap = new Map<string, User>();

const getUser: GetUser = (input) => {
  const user = UserMap.get(input.userId);
  if (!user) {
    return okAsync(none);
  } else {
    return okAsync(some(user));
  }
};

const listUser: ListUser = (input) => {
  const users = [];
  for (const user of UserMap.values()) {
    users.push(user);
    if (input.limit && users.length >= input.limit) {
      break;
    }
  }
  return okAsync({ users: users });
};

const createUser: CreateUser = (input) => {
  const user: User = {
    userId: globalThis.crypto.randomUUID(),
    userName: input.userName,
    email: input.email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  UserMap.set(user.userId, user);
  return okAsync(user);
};

const deleteUser: DeleteUser = (input) => {
  UserMap.delete(input.userId);
  return okAsync(undefined);
};

const updateUser: UpdateUser = (input) => {
  const user = UserMap.get(input.userId);
  if (!user) {
    return errAsync(new IdentityPluginError("User is not found"));
  }
  const newUser: User = {
    userId: user.userId,
    userName: input.userName,
    email: input.email,
    createdAt: user.createdAt,
    updatedAt: new Date().toISOString(),
  };
  UserMap.set(newUser.userId, newUser);
  return okAsync(newUser);
};

export const userProvider: UserProvider = {
  get: getUser,
  list: listUser,
  create: createUser,
  delete: deleteUser,
  update: updateUser,
};

export const adminUserProvider: UserProvider = {
  get: getUser,
  list: listUser,
  create: (input) => {
    const user: User = {
      userId: globalThis.crypto.randomUUID(),
      userName: input.userName,
      email: input.email,
      role: ["Admin"], // Force role to be admin
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    UserMap.set(user.userId, user);
    return okAsync(user);
  },
  delete: deleteUser,
  update: updateUser,
};
