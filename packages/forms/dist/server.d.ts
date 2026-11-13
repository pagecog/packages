/**
 * Server client for the Pagecog Forms API. Framework free (Request only), never throws.
 * Call it from your own server function / route handler, after your own transport-level checks:
 *
 *   const res = await pagecogSubscribe(request, env, input)   // input = the browser's fields
 *   return res                                                // { ok, message, ... } safe to send to the browser
 *
 * env.COLLECTOR_KEY is the site's collector key (the same one analytics uses). It is sent as x-pc-key and
 * never reaches the browser. The tenant is the request host verified against that key, never the input.
 */
import { type ContactResult, type SubscribeResult } from "./schema";
export declare const API_URL = "https://api.pagecog.com.au";
export type FormsEnv = {
    COLLECTOR_KEY?: string;
    PAGECOG_API_URL?: string;
};
/** Subscribe an email (double opt-in by default). `input` is the browser's fields. */
export declare function pagecogSubscribe(request: Request, env: unknown, input: unknown): Promise<SubscribeResult>;
/** Send a contact enquiry: name + (email or phone) + message. */
export declare function pagecogContact(request: Request, env: unknown, input: unknown): Promise<ContactResult>;
