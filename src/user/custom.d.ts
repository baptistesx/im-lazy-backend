import * as core from "express-serve-static-core";
import { User } from "../db/models/User";
export interface Address {
  /**
   * The first line of the address. For example, number or street.
   * @maxLength 300
   */
  address_line_1?: string;
  /**
   * The second line of the address. For example, suite or apartment number.
   * @maxLength 300
   */
  address_line_2?: string;
  /** The highest level sub-division in a country, which is usually a province, state, or ISO-3166-2 subdivision. */
  admin_area_1?: string;
  /** A city, town, or village. Smaller than `admin_area_level_1`. */
  admin_area_2?: string;
  /**
   * The postal code, which is the zip code or equivalent.
   * Typically required for countries with a postal code or an equivalent.
   */
  postal_code?: string;
  /** The [two-character ISO 3166-1 code](/docs/integration/direct/rest/country-codes/) that identifies the country or region. */
  country_code: string;
}

type PaymentResume = {
  createTime: string | undefined;
  updateTime: string | undefined;
  payer: {
    email: string | undefined;
    name: string | undefined;
    surname: string | undefined;
    id: string | undefined;
    address: Address | undefined;
  };
  amount: string | undefined;
  currency: string | undefined;
  status:
    | "COMPLETED"
    | "SAVED"
    | "APPROVED"
    | "VOIDED"
    | "PAYER_ACTION_REQUIRED"
    | undefined;
  merchandEmail: string | undefined;
  merchandId: string | undefined;
  billingToken?: string | null | undefined;
  facilitatorAccessToken: string;
  orderID: string;
  payerID?: string | null | undefined;
  paymentID?: string | null | undefined;
  subscriptionID?: string | null | undefined;
  authCode?: string | null | undefined;
};

interface CustomParamsDictionary extends core.ParamsDictionary {
  id?: string;
}

declare namespace Express {
  export interface Request {
    user?: User;
    params: CustomParamsDictionary;
    body: {
      id: number;
      name?: string;
      email?: string;
      role?: "admin" | "classic" | "premium";
      paymentResume?: PaymentResume;
      currentPassword?: string;
      newPassword?: string;
      headless?: boolean;
      developmentMode?: boolean;
      password?: string;
      city?: string;
      detectionRadius?: number;
      messageSubject?: string;
      englishMessage?: string;
      frenchMessage?: string;
      minimumAge?: number;
      maximumAge?: number;
    };
    cookies: { token?: string };
  }
}
