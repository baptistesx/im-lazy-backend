/* eslint-disable require-jsdoc */
"use strict";

import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { Optional } from "sequelize/types";
import { User } from "./User";

interface PaymentAttributes {
  id: number;
  details: object;
}

interface PaymentCreationAttributes extends Optional<PaymentAttributes, "id"> {}

@Table
export class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  @AutoIncrement
  @PrimaryKey
  @Column
  id!: number;

  // eslint-disable-next-line new-cap
  @Column(DataType.JSONB)
  details!: object;

  // eslint-disable-next-line new-cap
  @ForeignKey(() => User)
  @Column
  userId!: number;

  // eslint-disable-next-line new-cap
  @BelongsTo(() => User)
  user!: User;
}
