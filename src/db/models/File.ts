/* eslint-disable new-cap */
/* eslint-disable require-jsdoc */
"use strict";

import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { Optional } from "sequelize/types";
import { MemberData } from "../../workawayBot/workawayBot";
import { User } from "./User";

type WorkawayFormParams = {
  headless: boolean;
  developmentMode: boolean;
  password: string;
  city: string;
  detectionRadius: number;
  messageSubject: string;
  englishMessage: string;
  frenchMessage: string;
  minimumAge: number;
  maximumAge: number;
};

type FileContent = {
  date: Date;
  logs: string[];
  params: WorkawayFormParams;
  logsCleared: string[];
  members: MemberData[];
};

type FileAttributes = {
  id: number;
  name: string;
  content: FileContent;
  userId: number;
};

interface FileCreationAttributes extends Optional<FileAttributes, "id"> {}

@Table
export class File
  extends Model<FileAttributes, FileCreationAttributes>
  implements FileAttributes
{
  @AutoIncrement
  @PrimaryKey
  @Column
  id!: number;

  @Column
  name!: string;

  @Column(DataType.JSONB)
  content!: FileContent;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @ForeignKey(() => User)
  @Column
  userId!: number;

  @BelongsTo(() => User)
  user!: User;
}
