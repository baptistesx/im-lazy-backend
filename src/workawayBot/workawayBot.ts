import { Request, Response } from "express";
import { Browser, Page } from "puppeteer";
import { ParsedUrlQuery } from "querystring";
import { Socket } from "socket.io";
import { File as WorkawayFile } from "../db/models/File";
import { User } from "../db/models/User";
import { io } from "../main"; // Get the io instance initialized in main.ts
import { getCurrentDateTime, range, sleep } from "./utils";

// TODO: remove global vars if possible (currently: memory overflow in production)

// To navigate in browser and automation (bot)
const puppeteer = require("puppeteer");

// Browser that puppeteer will use to navigate
// key corresponds to userId
type Browsers = {
  [key: string]: Browser;
};
const browsers: Browsers = {};

// Page opened in browser on which puppeteer will navigate
type Pages = {
  [key: string]: Page;
};
const pages: Pages = {};

export type MemberScrapped = {
  age: number;
  from: string;
  idForMessage: string;
  messageSent: boolean;
  name: string;
  profileHref: string;
};
// Array of members scrapped in the perimeter around the city passed as parameter
// key corresponds to userId
export type MembersScrapped = {
  [key: string]: MemberScrapped[];
};
const membersDataScrapped: MembersScrapped = {};

// Boolean variables checked frequently to know if bot should stop
// TODO: maybe there is a better way to do this. Maybe with a timer ?
type StopBotOrders = {
  [key: string]: boolean;
};
const shouldStopBot: StopBotOrders = {};

// The user enters a city name or part of on the frontend app,
// The backend get on the page all city/country couples proposed and send them to the client
// citySelected is the couple finally selected by the client, on which the bot will click
type CitiesCountriesSelected = {
  [key: string]: string;
};
const citiesCountriesSelected: CitiesCountriesSelected = {};

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

export const initBotSocket = async (socket: Socket): Promise<void> => {
  const userId = (socket.handshake.query as CustomQuery).userId;

  if (userId === undefined) {
    throw Error("Error connecting the socket, userId in query is missing");
  }

  // Create a socket room for each user
  // TODO: is there a better way to do this?
  socket.join(userId);

  console.log(
    `${socket.id} connected and joined room ${userId} ${getCurrentDateTime()}`
  );

  // Join a conversation
  socket.emit(
    "connection",
    `${getCurrentDateTime()} ➤ CONNECTED TO BACKEND API`
  );

  try {
    const resultFile = await WorkawayFile.findOne({
      where: {
        userId: parseInt(userId),
        name: process.env.SESSION_FILENAME || "session.json",
      },
      order: [["createdAt", "DESC"]],
    });

    // Send logs when requested
    socket.emit("botLogs", resultFile?.content.logs || []);
  } catch (e) {
    socket.emit("botLogs", []);
  }

  // Leave the room if the user closes the socket
  socket.on("disconnect", () => {
    socket.leave(userId);
  });
};

const terminateBot = async (userId: number): Promise<void> => {
  // Reset stop variable
  shouldStopBot[userId] = false;

  await closeBrowser(userId);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ BOT WELL STOPPED`,
  });

  io.to(userId.toString()).emit("botStopped");
};

interface StartBotRequest extends Request {
  body: FormBotParams;
  user: User;
}
// Start bot
export const startBot = async (
  expressRequest: Request,
  res: Response
): Promise<void> => {
  const req = expressRequest as StartBotRequest;

  const { uuser: user, body } = req;

  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
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

  // Clear session params
  citiesCountriesSelected[user.id] = "";
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

    const resultFile = await WorkawayFile.findOne({
      where: {
        userId: user.id,
        name: process.env.SESSION_FILENAME || "session.json",
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

    await terminateBot(user.id);
  }
};

type LogAndEmitToRoomProps = {
  userId: number;
  logString: string;
  isSendingMessagesSentCounter?: boolean;
};

// Save logString in global logs variable and send it to the client
export const logAndEmitToRoom = async ({
  userId,
  logString,
  isSendingMessagesSentCounter = false,
}: LogAndEmitToRoomProps): Promise<void> => {
  console.log(`userId: ${userId}: ${logString}`);

  const resultFile = await WorkawayFile.findOne({
    where: {
      userId: userId,
      name: process.env.SESSION_FILENAME || "sessions.json",
    },
    order: [["createdAt", "DESC"]],
  });

  if (resultFile === null) {
    throw new Error("result file is null");
  }

  // If isSendingMessagesSentCounter = true, it means the string contains a counter, example: 10/34 messages send
  // It allows on the client logs to display a counter on the same line
  if (isSendingMessagesSentCounter) {
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
  await WorkawayFile.create({
    userId,
    name: process.env.SESSION_FILENAME || "session.json",
    content: {
      date: new Date(),
      params,
      logs: [],
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

    await terminateBot(userId);
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

  // The user enters a city name or part of, received here as param on the frontend app,
  // The backend get on the page all city/country couples (cities variable) proposed and send them to the client
  // citySelected is the couple finally selected by the client
  const cities = await pages[userId].$$eval(".dropdown-item", (nodes) =>
    nodes.map((node) => node.textContent)
  );

  if (cities.length === 0) {
    await logAndEmitToRoom({
      userId,
      logString: `${getCurrentDateTime()} ➤ NO CITIES AVAILABLE`,
    });

    await terminateBot(userId);

    return;
  }

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
  while (citiesCountriesSelected[userId] === "") {
    await sleep(500);
  }
  await pages[userId].waitForTimeout(2000);

  // In order workaway app take in account the city choice, it's necessary to click on one of the menu item
  const [location] = await pages[userId].$x(
    `//a[contains(., '${citiesCountriesSelected[userId]}')]`
  );

  await location.click();

  await pages[userId].waitForTimeout(2000);

  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ CITY SET TO ${
      citiesCountriesSelected[userId]
    }`,
  });

  // Change radius detection around current location
  await pages[userId].select(
    'select[name="distance"]',
    detectionRadius.toString()
  );

  // TODO: check why this log is not written in the file
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
  // TODO: check other pages if pagination exists (in order to scrap members on the next pages)
  const profilesHrefs: string[] = await page.$$eval(
    ".listentry-ww-profile-img-wrapper-inner",
    (elements) =>
      elements
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any) => {
          return a.href;
        })
  );

  // Get all integers in the range
  const ageRange = range({ start: minAge, end: maxAge });

  // TODO: check why this log is not written in the file
  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ TOTAL MEMBERS IN THE AREA: ${
      profilesHrefs.length
    }`,
  });

  // TODO: check why this log is not written in the file
  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ START SCRAPPING (ONLY MEMBERS IN THE AGE RANGE)...`,
  });

  // TODO: check if better iterating loop (knowing that there are await in the loop)
  for (let i = 0; i < profilesHrefs.length; i++) {
    if (shouldStopBot[userId]) {
      return true;
    }

    const href = profilesHrefs[i];

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

      const member: MemberScrapped = {
        name,
        age: age,
        profileHref: href,
        from: country,
        idForMessage: id,
        messageSent: false,
      };

      membersDataScrapped[userId].push(member);

      // TODO: check why this log is not written in the file
      await logAndEmitToRoom({
        userId,
        logString: `${getCurrentDateTime()} ➤ #${i} SCRAPPED`,
      });
    }
  }

  // TODO: check why this log is not written in the file
  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ ALL MEMBERS HAVE BEEN SCRAPPED`,
  });

  // TODO: check why this log is not written in the file
  await logAndEmitToRoom({
    userId,
    logString: `${getCurrentDateTime()} ➤ ${
      membersDataScrapped[userId].length
    } MEMBERS IN THE AGE RANGE`,
  });

  await WorkawayFile.update(
    {
      content: {
        ...resultFile.content,
        members: membersDataScrapped[userId],
      },
    },
    { where: { id: resultFile.id } }
  );

  // TODO: check why this log is not written in the file
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
  // TODO: check why this log is not written in the file
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

      await WorkawayFile.update(
        {
          content: {
            ...resultFile.content,
            members: membersDataScrapped[userId],
          },
        },
        { where: { id: resultFile.id } }
      );

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

  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
  }

  const resultFile = await WorkawayFile.findOne({
    where: {
      userId: user.id,
      name: process.env.SESSION_FILENAME || "session.json",
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
  }

  res.status(200).send("ok");
};

export const stopBot = async (req: Request, res: Response): Promise<void> => {
  const { uuser: user } = req;

  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
  }

  shouldStopBot[user.id] = true;

  // TODO: check why this log is not written in the file
  await logAndEmitToRoom({
    userId: user.id,
    logString: `${getCurrentDateTime()} ➤ BOT STOPPING...`,
  });

  res.status(200).send("ok");
};

export const setCity = async (req: Request, res: Response): Promise<void> => {
  const { uuser: user } = req;

  if (req.body.city === undefined) {
    res.status(400).send("city undefined");

    return;
  }
  if (user === undefined) {
    res.status(401).send("user is undefined");

    return;
  }

  res.send("ok");

  citiesCountriesSelected[user.id] = req.body.city;
};
