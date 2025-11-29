import { type EUserRole } from "~/server/kysely/enums";

export type TUser = {
  id: string;
  username: string;
  role: EUserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type TCreateUserInput = {
  username: string;
  password: string;
  role: EUserRole;
};
