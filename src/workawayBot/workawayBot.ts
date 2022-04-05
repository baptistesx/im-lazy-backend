const path = require("path");
const getCurrentDateTime = require(`${__dirname}/utils`).getCurrentDateTime;
const sleep = require(`${__dirname}/utils`).sleep;
// Function to get integers in a range
const range = require(`${__dirname}/utils`).range;

const File = require("../db/models").File;

// To navigate in browser and automation (bot)
const puppeteer = require("puppeteer");

// Filesystem module
const fs = require("fs");

// Get the io instance initialized in main.ts
let io = require("../main").io;

// Browser that puppeteer will use to navigate
let browsers = {};
// Page opened in browser on which puppeteer will navigate
let pages = {};

// Array of members scrapped in the perimeter around the city passed as parameter
let membersDataScrapped = {};

// Array of log strings
// let logs = [];

// Boolean variable checked frequently to know if bot should stop
// TODO: maybe there is a better way to do this. Maybe with a timer ?
let shouldStopBot = {};

// The user enters a city name or part of on the frontend app,
// The backend get on the page all city/country couples proposed and send them to the client
// citySelected is the couple finally selected by the client
let citySelected = {};

export const initSocket = async (socket) => {
  const userId = socket.handshake.query.userId;
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
    const resultFile = await File.findOne({
      where: {
        userId: userId,
        name: process.env.SESSION_FILENAME,
      },
      order: [["createdAt", "DESC"]],
    }).then((file) => JSON.parse(file));

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

const terminateBot = async (userId) => {
  shouldStopBot[userId] = false;

  await closeBrowser(userId);

  await logAndEmitToRoom(userId, `${getCurrentDateTime()} ➤ BOT WELL STOPPED`);

  io.to(userId.toString()).emit("botStopped");
};

// Start bot
export const startBot = async (req, res, next) => {
  const { user, body } = req;
  const {
    headless,
    developmentMode,
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

    await openBrowser(user.id, headless, developmentMode);

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

    await login(user.id, email, password);

    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }

    await moveToMeetupSection(user.id);

    await setSearchParams(user.id, city, detectionRadius);

    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }

    const resultFile = await File.findOne({
      where: {
        userId: user.id,
        name: process.env.SESSION_FILENAME,
      },
      order: [["createdAt", "DESC"]],
    });

    // TODO: there is maybe a better way to do that: interrupt current function StartBot if shouldStopBot variable pass to true in scrapMembers.
    // Same situation for sendMessageToMembers
    shouldStopBot[user.id] = await scrapMembers(
      user.id,
      pages[user.id],
      minimumAge,
      maximumAge,
      resultFile
    );
    if ([shouldStopBot[user.id]]) {
      await terminateBot(user.id);
      return;
    }

    shouldStopBot[user.id] = await sendMessageToMembers(
      user.id,
      pages[user.id],
      messageSubject,
      englishMessage,
      frenchMessage,
      city,
      developmentMode,
      resultFile
    );
    if (shouldStopBot[user.id]) {
      await terminateBot(user.id);
      return;
    }

    await closeBrowser(user.id);
  } catch (err) {
    await logAndEmitToRoom(
      user.id,
      `${getCurrentDateTime()} ➤ AN ERROR OCCURED : ${err}`
    );
    terminateBot(user.id);
  }
};

// Save logString in global logs variable and send it to the client

const logAndEmitToRoom = async (
  userId,
  logString,
  isSendingMessagesSentCounter = false
) => {
  console.log(logString);

  const resultFile = await File.findOne({
    where: {
      userId: userId,
      name: process.env.SESSION_FILENAME,
    },
    order: [["createdAt", "DESC"]],
  });
  resultFile.content = JSON.parse(resultFile.content);

  if (isSendingMessagesSentCounter) {
    // If isSendingMessagesSentCounter = true, it means the string contains a counter, example: 10/34 messages send
    // It allows on the client logs to display a counter on the same line
    resultFile.content.logs = [
      ...resultFile.content.logs.slice(0, -1),
      logString,
    ];
    resultFile.content = JSON.stringify(resultFile.content);
    resultFile.save();

    io.to(userId.toString()).emit("botLogsMessageSent", logString);
  } else {
    if (resultFile.content.logs === undefined) {
      resultFile.content.logs = [];
    }
    // Regular log
    resultFile.content.logs.push(logString);
    resultFile.content = JSON.stringify(resultFile.content);

    await resultFile.save();
    io.to(userId.toString()).emit("botLogs", logString);
  }
};

// Save form params entered by the client into a file
const saveParamsToFile = async ({ params, userId }) => {
  await File.create({
    userId,
    name: process.env.SESSION_FILENAME,
    content: JSON.stringify({ date: new Date(), params, logs: [] }),
  });

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ PARAMS FILE WRITTEN`
  );
};

const openBrowser = async (userId, isHeadless, isDevelopmentMode) => {
  browsers[userId] = await puppeteer.launch({
    headless: isHeadless,
    args: ["--no-sandbox"],
  });

  console.log(browsers);
  let str = `${getCurrentDateTime()} ➤ HEADLESS: ${isHeadless ? "ON" : "OFF"}`;

  await logAndEmitToRoom(userId, str);

  str = `${getCurrentDateTime()} ➤ DEVELOPMENT MODE: ${
    isDevelopmentMode ? "ON" : "OFF"
  }`;
  await logAndEmitToRoom(userId, str);
};

const openPage = async (userId) => {
  pages[userId] = await browsers[userId].newPage();

  await pages[userId].goto(process.env.SITE_URL);

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ SITE LOADED (${process.env.SITE_URL})`
  );
};

const openLoginForm = async (userId) => {
  // Open dropdown menu
  await pages[userId].click(".dropdown");

  // Click on "Login as a workawayer"
  await pages[userId].click('[data-who*="w"]');

  // Wait for the login popup form appears
  // TODO: check if better to use waitForSelector ()
  await pages[userId].waitForTimeout(2000);

  await logAndEmitToRoom(userId, `${getCurrentDateTime()} ➤ LOGIN FORM OPENED`);
};

const login = async (userId, email, password) => {
  await pages[userId].type('[data-login*="user"]', email);
  await pages[userId].type('[type*="password"]', password);

  await logAndEmitToRoom(userId, `${getCurrentDateTime()} ➤ LOGIN FORM FILLED`);

  await pages[userId].keyboard.press("Enter");

  await pages[userId].waitForNavigation();

  try {
    await pages[userId].waitForSelector("#myaccount-welcome");

    await logAndEmitToRoom(
      userId,
      `${getCurrentDateTime()} ➤ WELL CONNECTED WITH ${email}`
    );
  } catch (error) {
    shouldStopBot[userId] = true;

    await logAndEmitToRoom(
      userId,
      `${getCurrentDateTime()} ➤ ERROR WHILE LOG IN, CHECK YOUR IDS`
    );

    io.to(userId.toString()).emit("errorLogin");
    terminateBot(userId);
  }
};

const moveToMeetupSection = async (userId) => {
  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ MOVING TO MEETUP SECTION`
  );

  // Navigate to the meetup section
  await pages[userId].goto(process.env.MEETUP_SECTION_URL);

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ MOVED TO MEETUP SECTION`
  );

  await pages[userId].waitForTimeout(2000); //TODO: check what's better to do
};

const setSearchParams = async (userId, city, detectionRadius) => {
  // Set the location
  await pages[userId].focus("#autocomplete");
  await pages[userId].keyboard.type(city);

  await pages[userId].waitForTimeout(2000);

  //TODO: handle case where no cities were found
  // The user enters a city name or part of, received here as param on the frontend app,
  // The backend get on the page all city/country couples (cities variable) proposed and send them to the client
  // citySelected is the couple finally selected by the client
  const cities = await pages[userId].$$eval(".dropdown-item", (nodes) =>
    nodes.map((node) => node.textContent)
  );

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ AVAILABLE CITIES: ${cities.join()}`
  );

  io.to(userId.toString()).emit("citiesList", cities);

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ WAITING FOR THE CHOICE OF THE CITY`
  );

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

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ CITY SET TO ${citySelected[userId]}`
  );

  // Change radius detection around current location
  await pages[userId].select(
    'select[name="distance"]',
    detectionRadius.toString()
  );

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ DETECTION RADIUS SET TO ${detectionRadius.toString()}km`
  );
};

// Scrap members displayed on the page
const scrapMembers = async (userId, page, minAge, maxAge, resultFile) => {
  // Get all members profile page url (present on the page)
  // TODO: check other page if pagination exists (in order to scrap members on the next pages)
  const profilesHrefs = await page.$$eval("a", (hrefs) =>
    hrefs.map((a) => a.href).filter((link) => link.includes("/en/workawayer/"))
  );
  console.log("HHEEERRRR 3");

  // TODO: check why there are duplicate profiles
  // Remove duplicate using temporary Set
  const finalProfilesHrefsArray = [...new Set(profilesHrefs)];

  // Get all integers in the range
  const ageRange = range(parseInt(minAge), parseInt(maxAge));

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ TOTAL MEMBERS IN THE AREA: ${
      finalProfilesHrefsArray.length
    }`
  );

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ START SCRAPPING (ONLY MEMBERS IN THE AGE RANGE)...`
  );

  // TODO: check if better iterating loop (knowing that there are await in the loop)
  for (let i = 0; i < finalProfilesHrefsArray.length; i++) {
    if (shouldStopBot[userId]) {
      return true;
    }

    let href = finalProfilesHrefsArray[i];

    // Navigate to profile page
    await page.goto(href);

    // Extract the members age
    const sections = await page.$$eval(".media-body", (nodes) => {
      return nodes.map((node) => {
        const h2 = node.querySelector("h2");
        return h2?.textContent === "Age"
          ? parseInt(node.querySelector("p").textContent)
          : "";
      });
    });

    const age = sections.find((e) => e !== "");

    // Check if members age is in the valid range, if not do nothing
    if (ageRange.includes(age)) {
      // Extract members id. (Usefull to reach the message form url)
      const id = await page.evaluate(
        () =>
          document
            .querySelector("a.profile-submenu-btn-contact")
            .getAttribute("href")
            .split("=")[1]
      );

      // Extract members country
      const divContents = await page.$$eval(
        ".profile-title-list-text",
        (nodes) => {
          return nodes.map((node) => node.textContent);
        }
      );

      const country = divContents[0].trim();

      // Extract members name
      const name = await page
        .$eval("h1", (h1) => h1.textContent)
        .then((res) => res.trim());

      membersDataScrapped[userId].push({
        name: name,
        age: age,
        profileHref: href,
        from: country,
        idForMessage: id,
        messageSent: false,
      });

      await logAndEmitToRoom(
        userId,
        `${getCurrentDateTime()} ➤ #${i} SCRAPPED`
      );
    }
  }

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ ALL MEMBERS HAVE BEEN SCRAPPED`
  );

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ ${
      membersDataScrapped[userId].length
    } MEMBERS IN THE AGE RANGE`
  );

  resultFile.content = JSON.stringify({
    ...JSON.parse(resultFile.content),
    members: membersDataScrapped[userId],
  });
  console.log(resultFile.content);
  await resultFile.save();
  console.log("RESULT FILE SAVED");
  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ RESULTS SAVE to ${resultFile.name}`
  );
};

// Send french message to french people respecting criteria, english message otherwise
const sendMessageToMembers = async (
  userId,
  page,
  messageSubject,
  englishMessage,
  frenchMessage,
  city,
  developmentMode,
  resultFile
) => {
  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ START SENDING MESSAGES`
  );

  // Send message to scrapped members
  for (var index in membersDataScrapped[userId]) {
    if (shouldStopBot[userId]) {
      return true;
    }

    // Navigate to the message form corresponding to the scrapped user
    await page.goto(
      process.env.MESSAGE_FORM_URL +
        membersDataScrapped[userId][index].idForMessage
    );

    if ((await page.$("#conversationcontainer")) === null) {
      await page.type("#subject", messageSubject);

      // Checking user nationality
      if (membersDataScrapped[userId][index].from.includes("France")) {
        await page.type("#message", frenchMessage);
      } else {
        await page.type("#message", englishMessage);
      }

      await page.keyboard.press("Tab");

      // Do not send the message for real if developmentMode = true
      if (!developmentMode) {
        await page.keyboard.press("Enter");
      }

      membersDataScrapped[userId][index].messageSent = true;

      await page.waitForTimeout(1000);

      resultFile.content = JSON.stringify({
        ...JSON.parse(resultFile.content),
        members: membersDataScrapped[userId],
      });

      await resultFile.save();

      const indexWithOffset = parseInt(index) + 1;

      await logAndEmitToRoom(
        userId,
        `${getCurrentDateTime()} ➤ ${indexWithOffset}/${
          membersDataScrapped[userId].length
        } MESSAGES SENT`,
        true
      );
    }
  }

  await logAndEmitToRoom(
    userId,
    `${getCurrentDateTime()} ➤ ${
      membersDataScrapped[userId].length
    } MESSAGES HAVE BEEN SENT`
  );
};

const closeBrowser = async (userId) => {
  await browsers[userId].close();

  await logAndEmitToRoom(userId, `${getCurrentDateTime()} ➤ BROWSER CLOSED`);
};

export const clearLogs = async (req, res, next) => {
  const { user } = req;
  console.log(`${getCurrentDateTime()} ➤ LOGS CLEARED`);

  const resultFile = await File.findOne({
    where: {
      userId: user.id,
      name: process.env.SESSION_FILENAME,
    },
    order: [["createdAt", "DESC"]],
  });

  if (resultFile !== null) {
    resultFile.content = JSON.parse(resultFile.content);
    if (resultFile.content.logsCleared === undefined) {
      resultFile.content.logsCleared = [];
    }
    resultFile.content.logsCleared.push(resultFile.content.logs);
    resultFile.content.logs = [];
    resultFile.content = JSON.stringify(resultFile.content);
    // logs = [];
    resultFile.save();
  }
  res.status(200).send("ok");
};

export const stopBot = async (req, res, next) => {
  const { user } = req;
  shouldStopBot[user.id] = true;

  await logAndEmitToRoom(user.id, `${getCurrentDateTime()} ➤ BOT STOPPING...`);

  res.status(200).send("ok");
};

export const setCity = async (req, res, next) => {
  res.send("ok");

  citySelected[req.user.id] = req.body.city;
};

export const getFilesInfo = async (req, res, next) => {
  const files = await File.findAll({
    where: { userId: req.user.id },
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

export const deleteFile = async (req, res, next) => {
  const { user, params } = req;
  console.log("waaaaants to delete: ", parseInt(params.id), user.id);
  const file = await File.findOne({
    where: { userId: user.id, id: parseInt(params.id) },
  });

  file.destroy();

  await logAndEmitToRoom(
    user.id,
    `${getCurrentDateTime()} ➤ FILE WELL DELETED`
  );

  res.send("ok");
};

export const getFile = async (req, res, next) => {
  const { user, params } = req;

  const file = await File.findOne({
    where: { userId: user.id, id: params.id },
  });

  res.json({ file: { name: file.name, content: file.content } });
};
