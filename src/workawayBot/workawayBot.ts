const path = require("path");
const getCurrentDateTime = require(`${__dirname}/utils`).getCurrentDateTime;
const sleep = require(`${__dirname}/utils`).sleep;
// Function to get integers in a range
const range = require(`${__dirname}/utils`).range;

// To navigate in browser and automation (bot)
const puppeteer = require("puppeteer");

// Filesystem module
const fs = require("fs");

// Get the io instance initialized in main.ts
let io = require("../main").io;
// Socket room id to not loose logs if quit and come back on the bot logs page
// TODO: improve this to have a room per user or better system
const roomId = "1234";

// Browser that puppeteer will use to navigate
let browser;
// Page opened in browser on which puppeteer will navigate
let page;

// Array of members scrapped in the perimeter around the city passed as parameter
let membersDataScrapped = [];

// Array of log strings
let logs = [];

// Boolean variable checked frequently to know if bot should stop
// TODO: maybe there is a better way to do this. Maybe with a timer ?
let shouldStopBot = false;

// The user enters a city name or part of on the frontend app,
// The backend get on the page all city/country couples proposed and send them to the client
// citySelected is the couple finally selected by the client
let citySelected = "";

export const initSocket = async (socket) => {
  socket.join(roomId);

  console.log(
    `${socket.id} connected and joined room ${roomId} ${getCurrentDateTime()}`
  );

  // Join a conversation
  socket.emit(
    "connection",
    `${getCurrentDateTime()} ➤ CONNECTED TO BACKEND API`
  );

  // Send logs when requested
  socket.emit("botLogs", logs);

  // Leave the room if the user closes the socket
  socket.on("disconnect", () => {
    socket.leave(roomId);
  });
};

const terminateBot = async () => {
  shouldStopBot = false;

  await closeBrowser(browser);

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ BOT WELL STOPPED`);
};

// Start bot
export const startBot = async (req, res, next) => {
  // Reset citySelected, maybe not empty if the bot has already been launched before
  citySelected = "";

  res.send("Bot started");

  await saveParamsToFile(req.body);

  await openBrowser(req.body.headless, req.body.developmentMode);

  if (shouldStopBot) {
    await terminateBot();
    return;
  }

  await openPage();

  if (shouldStopBot) {
    await terminateBot();
    return;
  }

  await openLoginForm();

  await login(req.body.email, req.body.password);

  if (shouldStopBot) {
    await terminateBot();
    return;
  }

  await moveToMeetupSection();

  await setSearchParams(req.body.city, req.body.detectionRadius);

  if (shouldStopBot) {
    await terminateBot();
    return;
  }

  // TODO: there is maybe a better way to do that: interrupt current function StartBot if shouldStopBot variable pass to true in scrapMembers.
  // Same situation for sendMessageToMembers
  let shouldStop = await scrapMembers(
    page,
    req.body.minimumAge,
    req.body.maximumAge,
    req.body.city
  );
  if (shouldStopBot) {
    await terminateBot();
    return;
  }

  shouldStop = await sendMessageToMembers(
    page,
    req.body.messageSubject,
    req.body.englishMessage,
    req.body.frenchMessage,
    req.body.city,
    req.body.developmentMode
  );
  if (shouldStopBot) {
    await terminateBot();
    return;
  }

  await closeBrowser(browser);

  //TODO: announce to the client the work is done then he can set isRunning to false
  // io.to(roomId).emit("done", `${getCurrentDateTime()} ➤ WORK DONE`);
};

// Save logString in global logs variable and send it to the client

const logAndEmitToRoom = (logString, isSendingMessagesSentCounter = false) => {
  console.log(logString);

  if (isSendingMessagesSentCounter) {
    // If isSendingMessagesSentCounter = true, it means the string contains a counter, example: 10/34 messages send
    // It allows on the client logs to display a counter on the same line
    logs = [...logs.slice(0, -1), logString];

    io.to(roomId).emit("botLogsMessageSent", logString);
  } else {
    // Regular log
    logs.push(logString);

    io.to(roomId).emit("botLogs", logString);
  }
};

// Save form params entered by the client into a file
const saveParamsToFile = async (params) => {
  await fs.writeFile(process.env.PARAMS_FILE, JSON.stringify(params), (err) => {
    if (err) {
      throw err;
    }

    logAndEmitToRoom(`${getCurrentDateTime()} ➤ PARAMS FILE WRITTEN`);
  });
};

const openBrowser = async (isHeadless, isDevelopmentMode) => {
  browser = await puppeteer.launch({
    headless: isHeadless,
    args: ["--no-sandbox"],
  });

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ HEADLESS: ${isHeadless ? "ON" : "OFF"}`
  );

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ DEVELOPMENT MODE: ${
      isDevelopmentMode ? "ON" : "OFF"
    }`
  );
};

const openPage = async () => {
  page = await browser.newPage();

  await page.goto(process.env.SITE_URL);

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ SITE LOADED (${process.env.SITE_URL})`
  );
};

const openLoginForm = async () => {
  // Open dropdown menu
  await page.click(".dropdown");

  // Click on "Login as a workawayer"
  await page.click('[data-who*="w"]');

  // Wait for the login popup form appears
  // TODO: check if better to use waitForSelector ()
  await page.waitForTimeout(2000);

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ LOGIN FORM OPENED`);
};

const login = async (email, password) => {
  await page.type('[data-login*="user"]', email);
  await page.type('[type*="password"]', password);

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ LOGIN FORM FILLED`);

  await page.keyboard.press("Enter");

  await page.waitForNavigation();

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ WELL CONNECTED WITH ${email}`);

  await page.waitForNavigation();
};

const moveToMeetupSection = async () => {
  // Navigate to the meetup section
  await page.goto(process.env.MEETUP_SECTION_URL);

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ MOVED TO MEETUP SECTION`);

  await page.waitForNavigation();

  await page.waitForTimeout(4000); //TODO: check what's better to do
};

const setSearchParams = async (city, detectionRadius) => {
  // Set the location
  await page.type("#autocomplete", city);

  await page.waitForTimeout(2000);

  // The user enters a city name or part of, received here as param on the frontend app,
  // The backend get on the page all city/country couples (cities variable) proposed and send them to the client
  // citySelected is the couple finally selected by the client
  const cities = await page.$$eval(".dropdown-item", (nodes) =>
    nodes.map((node) => node.textContent)
  );

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ AVAILABLE CITIES: ${cities.join()}`
  );

  io.to(roomId).emit("citiesList", cities);

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ WAITING FOR THE CHOICE OF THE CITY`
  );

  // Wait for the client to choose the city/country couple
  while (citySelected === "") {
    await sleep(500);
  }

  // In order workaway app take in account the city choice, it's necessary to click on one of the menu item
  const [location] = await page.$x(`//a[contains(., '${citySelected}')]`);

  if (location) {
    await location.click();
  }
  await page.waitForTimeout(2000);

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ CITY SET TO ${citySelected}`);

  // Change radius detection around current location
  await page.select('select[name="distance"]', detectionRadius.toString());

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ DETECTION RADIUS SET TO ${detectionRadius}km`
  );
};

// Scrap members displayed on the page
const scrapMembers = async (page, minAge, maxAge, city) => {
  // Get all members profile page url (present on the page)
  // TODO: check other page if pagination exists (in order to scrap members on the next pages)
  const profilesHrefs = await page.$$eval("a", (hrefs) =>
    hrefs.map((a) => a.href).filter((link) => link.includes("/en/workawayer/"))
  );

  // TODO: check why there are duplicate profiles
  // Remove duplicate using temporary Set
  const finalProfilesHrefsArray = [...new Set(profilesHrefs)];

  // Get all integers in the range
  const ageRange = range(parseInt(minAge), parseInt(maxAge));

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ TOTAL MEMBERS IN THE AREA: ${
      finalProfilesHrefsArray.length
    }`
  );

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ START SCRAPPING...`);

  // TODO: check if better iterating loop (knowing that there are await in the loop)
  for (let i = 0; i < finalProfilesHrefsArray.length; i++) {
    if (shouldStopBot) {
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

      membersDataScrapped.push({
        name: name,
        age: age,
        profileHref: href,
        from: country,
        idForMessage: id,
        messageSent: false,
      });

      logAndEmitToRoom(`${getCurrentDateTime()} ➤ #${i} SCRAPPED`);
    }
  }

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ ALL MEMBERS HAVE BEEN SCRAPPED`);

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ ${
      membersDataScrapped.length
    } MEMBERS IN THE AGE RANGE`
  );

  // TODO: add specific client id or something in order to render this file accessible only by this client
  // TODO: save this file somewhere else?
  const resultFile = `dist/${city}_members.json`;

  await fs.writeFile(
    resultFile,
    JSON.stringify({ members: membersDataScrapped }),
    (err) => {
      if (err) throw err;

      logAndEmitToRoom(
        `${getCurrentDateTime()} ➤ RESULTS SAVE to ${resultFile}`
      );
    }
  );
};

// Send french message to french people respecting criteria, english message otherwise
const sendMessageToMembers = async (
  page,
  messageSubject,
  englishMessage,
  frenchMessage,
  city,
  developmentMode
) => {
  logAndEmitToRoom(`${getCurrentDateTime()} ➤ START SENDING MESSAGES`);

  // Send message to scrapped members
  for (var index in membersDataScrapped) {
    if (shouldStopBot) {
      return true;
    }

    // Navigate to the message form corresponding to the scrapped user
    await page.goto(
      process.env.MESSAGE_FORM_URL + membersDataScrapped[index].idForMessage
    );

    if ((await page.$("#conversationcontainer")) === null) {
      await page.type("#subject", messageSubject);

      // Checking user nationality
      if (membersDataScrapped[index].from.includes("France")) {
        await page.type("#message", frenchMessage);
      } else {
        await page.type("#message", englishMessage);
      }

      await page.keyboard.press("Tab");

      // Do not send the message for real if developmentMode = true
      if (!developmentMode) {
        await page.keyboard.press("Enter");
      }

      membersDataScrapped[index].messageSent = true;

      await page.waitForTimeout(1000);

      const resultFile = `dist/${city}_members.json`;

      await fs.writeFile(
        resultFile,
        JSON.stringify({ members: membersDataScrapped }),
        (err) => {
          if (err) throw err;
          const indexWithOffset = parseInt(index) + 1;

          // TODO: check issue with index and message, no index 1-2/membersDataScrapped.length
          // and membersDataScrapped.length/membersDataScrapped.length displayed twice
          logAndEmitToRoom(
            `${getCurrentDateTime()} ➤ ${indexWithOffset}/${
              membersDataScrapped.length
            } MESSAGES SENT`,
            true
          );
        }
      );
    }
  }

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ ${
      membersDataScrapped.length
    } MESSAGES HAVE BEEN SENT`
  );
};

const closeBrowser = async (browser) => {
  await browser.close();

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ BROWSER CLOSED`);
};

export const clearLogs = async (req, res, next) => {
  console.log(`${getCurrentDateTime()} ➤ LOGS CLEARED`);

  logs = [];

  res.status(200).send("ok");
};

export const stopBot = async (req, res, next) => {
  shouldStopBot = true;

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ BOT STOPPING...`);

  res.status(200).send("ok");
};

export const setCity = async (req, res, next) => {
  res.send("ok");

  citySelected = req.body.city;
};

export const getFilesName = (req, res, next) => {
  const filesName = fs
    .readdirSync("./dist")
    .filter((file) => file.includes("json"));

  res.send(filesName);
};

export const deleteFile = (req, res, next) => {
  try {
    fs.unlinkSync(`./dist/${req.query.name}`);

    logAndEmitToRoom(
      `${getCurrentDateTime()} ➤ /dist/${req.query.name} WELL DELETED`
    );

    res.send("ok");
  } catch (err) {
    logAndEmitToRoom(
      `${getCurrentDateTime()} ➤ FAILED TO DELETE /dist/${req.query.name}`
    );

    res.send("ko");

    console.error(err);
  }
};

export const getFile = (req, res, next) => {
  console.log("get file", req.query.name);
  var filePath = `./dist/${req.query.name}`;

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.send("ko");
      console.error(err);
      return;
    }
    res.json(data);
  });
};
