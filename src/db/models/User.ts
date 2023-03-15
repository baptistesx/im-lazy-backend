/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
"use strict";

import {
  AutoIncrement,
  Column,
  CreatedAt,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
  HasOne,
} from "sequelize-typescript";
import { Optional } from "sequelize/types";
import { File } from "./File";
import { Payment } from "./Payment";

export enum RolesEnum {
  ADMIN = "admin",
  PREMIUM = "premium",
  CLASSIC = "classic",
}

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  googleId: string;
  provider: string;
  role: RolesEnum;
  isEmailVerified: boolean;
  lastLogin: Date;
  emailVerificationString: string;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | "id"
    | "googleId"
    | "password"
    | "provider"
    | "lastLogin"
    | "isEmailVerified"
    | "role"
    | "emailVerificationString"
  > {}

@Table
export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  @AutoIncrement
  @PrimaryKey
  @Column
  id!: number;

  @Column
  name!: string;

  @Column
  email!: string;

  @Column
  password!: string;

  @Column
  googleId!: string;

  @Column
  provider!: string;

  @Default(RolesEnum.CLASSIC)
  @Column({ type: DataType.ENUM({ values: Object.keys(RolesEnum) }) })
  role!: RolesEnum;

  @Default(false)
  @Column
  isEmailVerified!: boolean;

  @Column
  lastLogin!: Date;

  @Column
  emailVerificationString!: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // eslint-disable-next-line new-cap
  @HasMany(() => File)
  files!: File[];

  // eslint-disable-next-line new-cap
  @HasOne(() => Payment)
  payment!: Payment[];
}
