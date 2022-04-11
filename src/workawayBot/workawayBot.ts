import { Request, Response } from "express";
import { Browser, Page } from "puppeteer";
import { ParsedUrlQuery } from "querystring";
import { Socket } from "socket.io";

import { File as WorkawayFile } from "../db/models/File";
import { User } from "../db/models/User";

const getCurrentDateTime = require(`${__dirname}/utils`).getCurrentDateTime;
const sleep = require(`${__dirname}/utils`).sleep;
// Function to get integers in a range
import { range } from "./utils";
// To navigate in browser and automation (bot)
const puppeteer = require("puppeteer");

// Get the io instance initialized in main.ts
// const io = require("../main").io;
import { io } from "../main";
// Browser that puppeteer will use to navigate
type VariableBrowsersObject = {
  [key: string]: Browser;
};
const browsers: VariableBrowsersObject = {};
// Page opened in browser on which puppeteer will navigate
type VariablePagesObject = {
  [key: string]: Page;
};
const pages: VariablePagesObject = {};

export type MemberData = {
  name: string;
  age: number;
  profileHref: string;
  from: string;
  idForMessage: string;
  messageSent: boolean;
};
// Array of members scrapped in the perimeter around the city passed as parameter
export type VariableMemebersArraysObject = {
  [key: string]: MemberData[];
};
const membersDataScrapped: VariableMemebersArraysObject = {};

// Array of log strings
// let logs = [];

// Boolean variable checked frequently to know if bot should stop
// TODO: maybe there is a better way to do this. Maybe with a timer ?
type VariableBooleansObject = {
  [key: string]: boolean;
};

const shouldStopBot: VariableBooleansObject = {};

// The user enters a city name or part of on the frontend app,
// The backend get on the page all city/country couples proposed and send them to the client
// citySelected is the couple finally selected by the client

type VariableStringsObject = {
  [key: string]: string;
};

const citySelected: VariableStringsObject = {};

declare global {
  type SocketQuery = ParsedUrlQuery & {
    query: {
      userId: string;
    };
  };
}

interface CustomQuery extends ParsedUrlQuery {
  userId?: string;
}

export const initSocket = async (socket: Socket): Promise<void> => {
  const userId = (socket.handshake.query as CustomQuery).userId;

  if (userId === undefined) {
    throw Error("Error connecting the socket, userId in query is missing");
  }
  socket.join(userId);

  console.log(
    `${socket.id} connected and joined room ${userId} ${getCurrentDateTime()}`
  );

  // Join a conversation
  socket.emit(
    "connection",
    `${getCurrentDateTime()} ➤ CONNECTED TO BACKEND API`
  );
  if (process.env.SESSION_FILENAME === undefined) {
    throw new Error("process.env.SESSION_FILENAME is undefined");
  }
  try {
    const resultFile = await WorkawayFile.findOne({
      where: {
        userId: parseInt(userId),
        name: process.env.SESSION_FILENAME,
      },
      order: [["createdAt", "DESC"]],
    });

    if (resultFile === null) {
      throw new Error("session file is null");
    }

    // Send logs when requested
    socket.emit("botLogs", resultFile.content.logs);
  } catch (e) {
    socket.emit("botLogs", []);
  }

  // Leave the room if the user closes the socket
  socket.on("disconnect", () => {
    socket.leave(userId);
  });
};

const terminateBot = async (userId: number): Promise<void> => {
  shouldStopBot[userId] = false;

  await closeBrowser(userId);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ BOT WELL STOPPED`,
  });

  io.to(userId.toString()).emit("botStopped");
};

interface StartBotRequest extends Request {
  user: User;

  body: FormBotParams;
}
// Start bot
export const startBot = async (
  req: StartBotRequest,
  res: Response
): Promise<void> => {
  const { uuser: user, body } = req;
  if (user === undefined) {
    throw new Error("user is undefined");
  }
  const {
    headless: isHeadless,
    developmentMode: isDevelopmentMode,
    email,
    password,
    city,
    detectionRadius,
    messageSubject,
    englishMessage,
    frenchMessage,
    minimumAge,
    maximumAge,
  } = body;
  // Reset citySelected, maybe not empty if the bot has already been launched before
  citySelected[user.id] = "";
  shouldStopBot[user.id] = false;
  membersDataScrapped[user.id] = [];

  try {
    res.send("Bot started");

    await saveParamsToFile({ params: body, userId: user.id });

    await openBrowser({ userId: user.id, isHeadless, isDevelopmentMode });

    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }

    await openPage(user.id);

    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }

    await openLoginForm(user.id);

    await login({ userId: user.id, email, password });

    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }

    await moveToMeetupSection(user.id);

    await setSearchParams({ userId: user.id, city, detectionRadius });

    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }
    if (process.env.SESSION_FILENAME === undefined) {
      throw new Error("process.env.SESSION_FILENAME is undefined");
    }
    const resultFile = await WorkawayFile.findOne({
      where: {
        userId: user.id,
        name: process.env.SESSION_FILENAME,
      },
      order: [["createdAt", "DESC"]],
    });
    if (resultFile === null) {
      throw new Error("result file is null");
    }
    // TODO: there is maybe a better way to do that: interrupt current function StartBot if shouldStopBot variable pass to true in scrapMembers.
    // Same situation for sendMessageToMembers
    shouldStopBot[user.id] = await scrapMembers({
      userId: user.id,
      page: pages[user.id],
      minAge: minimumAge,
      maxAge: maximumAge,
      resultFile,
    });

    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }

    shouldStopBot[user.id] = await sendMessageToMembers({
      userId: user.id,
      page: pages[user.id],
      messageSubject,
      englishMessage,
      frenchMessage,
      isDevelopmentMode,
      resultFile,
    });
    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }

    await closeBrowser(user.id);
  } catch (err) {
    await logAndEmitToRoom({
      userId: user.id,
      logString: `${getCurrentDateTime()} ➤ AN ERROR OCCURED : ${err}`,
    });
    terminateBot(user.id);
  }
};

// Save logString in global logs variable and send it to the client

type LogAndEmitToRoomProps = {
  userId: number;
  logString: string;
  isSendingMessagesSentCounter?: boolean;
};

const logAndEmitToRoom = async ({
  userId,
  logString,
  isSendingMessagesSentCounter = false,
}: LogAndEmitToRoomProps): Promise<void> => {
  console.log(logString);
  if (process.env.SESSION_FILENAME === undefined) {
    throw new Error("process.env.SESSION_FILENAME is undefined");
  }
  const resultFile = await WorkawayFile.findOne({
    where: {
      userId: userId,
      name: process.env.SESSION_FILENAME,
    },
    order: [["createdAt", "DESC"]],
  });

  if (resultFile === null) {
    throw new Error("result file is null");
  }

  if (isSendingMessagesSentCounter) {
    // If isSendingMessagesSentCounter = true, it means the string contains a counter, example: 10/34 messages send
    // It allows on the client logs to display a counter on the same line
    // resultFile.content.logs = [
    //   ...resultFile.content.logs.slice(0, -1),
    //   logString,
    // ];

    // await resultFile.save();

    await WorkawayFile.update(
      {
        content: {
          ...resultFile.content,
          logs: [...resultFile.content.logs.slice(0, -1), logString],
        },
      },
      { where: { id: resultFile.id } }
    );

    io.to(userId.toString()).emit("botLogsMessageSent", logString);
  } else {
    if (resultFile.content.logs === undefined) {
      await WorkawayFile.update(
        { content: { ...resultFile.content, logs: [] } },
        { where: { id: resultFile.id } }
      );
    }
    // Regular log
    await WorkawayFile.update(
      {
        content: {
          ...resultFile.content,
          logs: [...resultFile.content.logs, logString],
        },
      },
      { where: { id: resultFile.id } }
    );

    io.to(userId.toString()).emit("botLogs", logString);
  }
};

type FormBotParams = {
  englishMessage: string;
  frenchMessage: string;
  messageSubject: string;
  maximumAge: number;
  minimumAge: number;
  city: string;
  password: string;
  email: string;
  headless: boolean;
  developmentMode: boolean;
  detectionRadius: number;
};

type SaveParamsToFileProps = {
  params: FormBotParams;
  userId: number;
};
// Save form params entered by the client into a file
const saveParamsToFile = async ({
  params,
  userId,
}: SaveParamsToFileProps): Promise<void> => {
  if (process.env.SESSION_FILENAME === undefined) {
    throw new Error("process.env.SESSION_FILENAME is undefined");
  }
  await WorkawayFile.create({
    userId,
    name: process.env.SESSION_FILENAME,
    content: {
      date: new Date(),
      params,
      logs: ["test", "okk"],
      members: [],
      logsCleared: [],
    },
  });

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ PARAMS FILE WRITTEN`,
  });
};

type OpenBrowserProps = {
  userId: number;
  isHeadless: boolean;
  isDevelopmentMode: boolean;
};

const openBrowser = async ({
  userId,
  isHeadless,
  isDevelopmentMode,
}: OpenBrowserProps): Promise<void> => {
  browsers[userId] = await puppeteer.launch({
    headless: isHeadless,
    args: ["--no-sandbox"],
  });

  let logString = `${getCurrentDateTime()} ➤ HEADLESS: ${
    isHeadless ? "ON" : "OFF"
  }`;

  await logAndEmitToRoom({ userId, logString });

  logString = `${getCurrentDateTime()} ➤ DEVELOPMENT MODE: ${
    isDevelopmentMode ? "ON" : "OFF"
  }`;
  await logAndEmitToRoom({ userId, logString });
};

const openPage = async (userId: number): Promise<void> => {
  pages[userId] = await browsers[userId].newPage();
  if (process.env.SITE_URL === undefined) {
    throw new Error("process.env.SITE_URL");
  }
  await pages[userId].goto(process.env.SITE_URL);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ SITE LOADED (${
      process.env.SITE_URL
    })`,
  });
};

const openLoginForm = async (userId: number): Promise<void> => {
  // Open dropdown menu
  await pages[userId].click(".dropdown");

  // Click on "Login as a workawayer"
  await pages[userId].click('[data-who*="w"]');

  // Wait for the login popup form appears
  // TODO: check if better to use waitForSelector ()
  await pages[userId].waitForTimeout(2000);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ LOGIN FORM OPENED`,
  });
};

type LoginProps = { userId: number; email: string; password: string };

const login = async ({
  userId,
  email,
  password,
}: LoginProps): Promise<void> => {
  await pages[userId].type('[data-login*="user"]', email);
  await pages[userId].type('[type*="password"]', password);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ LOGIN FORM FILLED`,
  });

  await pages[userId].keyboard.press("Enter");

  await pages[userId].waitForNavigation();

  try {
    await pages[userId].waitForSelector("#myaccount-welcome");

    await logAndEmitToRoom({
      userId,
      logString: `${getCurrentDateTime()} ➤ WELL CONNECTED WITH ${email}`,
    });
  } catch (error) {
    shouldStopBot[userId] = true;

    await logAndEmitToRoom({
      userId,
      logString: `${getCurrentDateTime()} ➤ ERROR WHILE LOG IN, CHECK YOUR IDS`,
    });

    io.to(userId.toString()).emit("errorLogin");
    terminateBot(userId);
  }
};

const moveToMeetupSection = async (userId: number): Promise<void> => {
  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ MOVING TO MEETUP SECTION`,
  });

  if (process.env.MEETUP_SECTION_URL === undefined) {
    throw new Error("process.env.SITE_URL");
  }
  // Navigate to the meetup section
  await pages[userId].goto(process.env.MEETUP_SECTION_URL);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ MOVED TO MEETUP SECTION`,
  });

  await pages[userId].waitForTimeout(2000); // TODO: check what's better to do
};

type SetSearchParamsProps = {
  userId: number;
  city: string;
  detectionRadius: number;
};

const setSearchParams = async ({
  userId,
  city,
  detectionRadius,
}: SetSearchParamsProps): Promise<void> => {
  // Set the location
  await pages[userId].focus("#autocomplete");
  await pages[userId].keyboard.type(city);

  await pages[userId].waitForTimeout(2000);

  // TODO: handle case where no cities were found
  // The user enters a city name or part of, received here as param on the frontend app,
  // The backend get on the page all city/country couples (cities variable) proposed and send them to the client
  // citySelected is the couple finally selected by the client
  const cities = await pages[userId].$$eval(".dropdown-item", (nodes) =>
    nodes.map((node) => node.textContent)
  );

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ AVAILABLE CITIES: ${cities.join()}`,
  });

  io.to(userId.toString()).emit("citiesList", cities);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ WAITING FOR THE CHOICE OF THE CITY`,
  });

  // Wait for the client to choose the city/country couple
  while (citySelected[userId] === "") {
    await sleep(500);
  }
  await pages[userId].waitForTimeout(2000);

  // In order workaway app take in account the city choice, it's necessary to click on one of the menu item
  const [location] = await pages[userId].$x(
    `//a[contains(., '${citySelected[userId]}')]`
  );

  if (location) {
    await location.click();
  }
  await pages[userId].waitForTimeout(2000);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ CITY SET TO ${citySelected[userId]}`,
  });

  // Change radius detection around current location
  await pages[userId].select(
    'select[name="distance"]',
    detectionRadius.toString()
  );

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ DETECTION RADIUS SET TO ${detectionRadius.toString()}km`,
  });
};

type ScrapMembersProps = {
  userId: number;
  page: Page;
  minAge: number;
  maxAge: number;
  resultFile: WorkawayFile;
};

// Scrap members displayed on the page
const scrapMembers = async ({
  userId,
  page,
  minAge,
  maxAge,
  resultFile,
}: ScrapMembersProps): Promise<boolean> => {
  // Get all members profile page url (present on the page)
  // TODO: check other page if pagination exists (in order to scrap members on the next pages)
  const profilesHrefs = await page.$$eval("a", (hrefs) =>
    hrefs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => {
        return a.href;
      })
      .filter((link) => link !== undefined && link.includes("/en/workawayer/"))
  );

  // TODO: check why there are duplicate profiles
  // Remove duplicate using temporary Set
  const finalProfilesHrefsArray = [...new Set(profilesHrefs)];

  // Get all integers in the range
  const ageRange = range({ start: minAge, end: maxAge });

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ TOTAL MEMBERS IN THE AREA: ${
      finalProfilesHrefsArray.length
    }`,
  });

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ START SCRAPPING (ONLY MEMBERS IN THE AGE RANGE)...`,
  });

  // TODO: check if better iterating loop (knowing that there are await in the loop)
  for (let i = 0; i < finalProfilesHrefsArray.length; i++) {
    if (shouldStopBot[userId]) {
      return true;
    }

    const href = finalProfilesHrefsArray[i];

    if (href === undefined) {
      throw Error("member href undefined");
    }
    // Navigate to profile page
    await page.goto(href);

    // Extract the members age
    const sections = await page.$$eval(".media-body", (nodes) => {
      return nodes.map((node) => {
        const h2 = node.querySelector("h2");
        const p = node.querySelector("p");
        if (h2 === null || p === null) {
          return null;
        }
        return h2.textContent === "Age" && p.textContent !== null
          ? parseInt(p.textContent)
          : "";
      });
    });
    if (sections === null || sections.length === 0) {
      throw new Error("section null or empty");
    }
    const age = sections.filter((e) => typeof e === "number")[0];
    if (age === null || age === "") {
      console.log(sections);
      throw new Error("age is null or undefined or ''");
    }
    // Check if members age is in the valid range, if not do nothing
    if (ageRange.includes(age)) {
      // Extract members id. (Usefull to reach the message form url)

      const id = await page.evaluate(
        'document.querySelector("a.profile-submenu-btn-contact").getAttribute("href").split("=")[1]'
      );

      // Extract members country
      const divContents = await page.$$eval(
        ".profile-title-list-text",
        (nodes) => {
          return nodes.map((node) => node.textContent);
        }
      );

      const country = divContents[0]?.trim();

      // Extract members name
      const name = await page
        .$eval("h1", (h1) => h1.textContent)
        .then((res) => res?.trim());

      if (name === undefined || country === undefined) {
        throw new Error("name, age or form is undefined");
      }
      const test: MemberData = {
        name,
        age: age,
        profileHref: href,
        from: country,
        idForMessage: id,
        messageSent: false,
      };
      console.log("test push", test);
      membersDataScrapped[userId].push(test);
      console.log(membersDataScrapped);
      await logAndEmitToRoom({
        userId,
        logString: `${getCurrentDateTime()} ➤ #${i} SCRAPPED`,
      });
    }
  }

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ ALL MEMBERS HAVE BEEN SCRAPPED`,
  });

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ ${
      membersDataScrapped[userId].length
    } MEMBERS IN THE AGE RANGE`,
  });
  console.log("before update", membersDataScrapped[userId]);
  await WorkawayFile.update(
    {
      content: {
        ...resultFile.content,
        members: membersDataScrapped[userId],
      },
    },
    { where: { id: resultFile.id } }
  );

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ RESULTS SAVE to ${resultFile.name}`,
  });

  return false;
};

type SendMessageToMembersProps = {
  userId: number;
  page: Page;
  messageSubject: string;
  englishMessage: string;
  frenchMessage: string;
  isDevelopmentMode: boolean;
  resultFile: WorkawayFile;
};

// Send french message to french people respecting criteria, english message otherwise
const sendMessageToMembers = async ({
  userId,
  page,
  messageSubject,
  englishMessage,
  frenchMessage,
  isDevelopmentMode,
  resultFile,
}: SendMessageToMembersProps): Promise<boolean> => {
  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ START SENDING MESSAGES`,
  });

  // Send message to scrapped members
  for (let i = 0; i < membersDataScrapped[userId].length; i++) {
    if (shouldStopBot[userId]) {
      return true;
    }

    // Navigate to the message form corresponding to the scrapped user
    await page.goto(
      process.env.MESSAGE_FORM_URL + membersDataScrapped[userId][i].idForMessage
    );

    if ((await page.$("#conversationcontainer")) === null) {
      await page.type("#subject", messageSubject);

      // Checking user nationality
      if (membersDataScrapped[userId][i].from.includes("France")) {
        await page.type("#message", frenchMessage);
      } else {
        await page.type("#message", englishMessage);
      }

      await page.keyboard.press("Tab");

      // Do not send the message for real if developmentMode = true
      if (!isDevelopmentMode) {
        await page.keyboard.press("Enter");
      }

      membersDataScrapped[userId][i].messageSent = true;

      await page.waitForTimeout(1000);
      console.log("before update", membersDataScrapped[userId]);

      await WorkawayFile.update(
        {
          content: {
            ...resultFile.content,
            members: membersDataScrapped[userId],
          },
        },
        { where: { id: resultFile.id } }
      );
      // resultFile.content = {
      //   ...resultFile.content,
      //   members: membersDataScrapped[userId],
      // };
      // console.log("SAVING4:", resultFile.content);

      // await resultFile.save();

      const indexWithOffset = i + 1;

      await logAndEmitToRoom({
        userId,
        logString: `${getCurrentDateTime()} ➤ ${indexWithOffset}/${
          membersDataScrapped[userId].length
        } MESSAGES SENT`,
        isSendingMessagesSentCounter: true,
      });
    }
  }

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ ${
      membersDataScrapped[userId].length
    } MESSAGES HAVE BEEN SENT`,
  });

  return false;
};

const closeBrowser = async (userId: number): Promise<void> => {
  await browsers[userId].close();

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ BROWSER CLOSED`,
  });
};

export const clearLogs = async (req: Request, res: Response): Promise<void> => {
  const { uuser: user } = req;
  console.log(`${getCurrentDateTime()} ➤ LOGS CLEARED`);
  if (user === undefined) {
    throw new Error("user is undefined");
  }
  if (process.env.SESSION_FILENAME === undefined) {
    throw new Error("process.env.SESSION_FILENAME is undefined");
  }
  const resultFile = await WorkawayFile.findOne({
    where: {
      userId: user.id,
      name: process.env.SESSION_FILENAME,
    },
    order: [["createdAt", "DESC"]],
  });

  if (resultFile !== null) {
    await WorkawayFile.update(
      {
        content: {
          ...resultFile.content,
          logsCleared: [
            ...resultFile.content.logsCleared,
            ...resultFile.content.logs,
          ],
          logs: [],
        },
      },
      { where: { id: resultFile.id } }
    );
    // resultFile.content.logsCleared = [
    //   ...resultFile.content.logsCleared,
    //   ...resultFile.content.logs,
    // ];
    // resultFile.content.logs = [];
    // console.log("SAVING5:", resultFile.content);

    // await resultFile.save();
  }
  res.status(200).send("ok");
};

export const stopBot = async (req: Request, res: Response): Promise<void> => {
  const { uuser: user } = req;
  if (user === undefined) {
    throw new Error("user is undefined");
  }
  shouldStopBot[user.id] = true;

  await logAndEmitToRoom({
    userId: user.id,
    logString: `${getCurrentDateTime()} ➤ BOT STOPPING...`,
  });

  res.status(200).send("ok");
};

export const setCity = async (req: Request, res: Response): Promise<void> => {
  res.send("ok");
  if (req.body.city === undefined) {
    throw Error("city undefined");
  }
  if (req.uuser === undefined) {
    throw new Error("user is undefined");
  }
  citySelected[req.uuser.id] = req.body.city;
};

export const getFilesInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (req.uuser === undefined) {
    throw new Error("user is undefined");
  }
  const files = await WorkawayFile.findAll({
    where: { userId: req.uuser.id },
  });
  const reducedFiles = files.map((file) => {
    return {
      id: file.id,
      name: file.name,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  });

  res.send({ files: reducedFiles });
};

export const deleteFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { uuser: user, params } = req;
  if (user === undefined) {
    throw new Error("user is undefined");
  }
  const file = await WorkawayFile.findOne({
    where: { userId: user.id, id: params.id },
  });
  if (file === null) {
    throw new Error("file is null");
  }
  file.destroy();

  await logAndEmitToRoom({
    userId: user.id,
    logString: `${getCurrentDateTime()} ➤ FILE WELL DELETED`,
  });

  res.send("ok");
};

export const getFile = async (req: Request, res: Response): Promise<void> => {
  const { uuser: user, params } = req;
  if (user === undefined) {
    throw new Error("user is undefined");
  }
  const file = await WorkawayFile.findOne({
    where: { userId: user.id, id: params.id },
  });
  if (file === null) {
    throw new Error("file is null");
  }
  res.json({ file: { name: file.name, content: file.content } });
};
