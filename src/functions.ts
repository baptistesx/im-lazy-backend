const puppeteer = require("puppeteer");
const fs = require("fs");
const range = require("./utils").range;
var format = require("date-fns/format");
let browser;
let page;
let membersDataScrapped = [];
let io = require("./main").io;
let logs = [];
const roomId = "1234";
let shouldStopBot = false;
let citySelected = "";

const getCurrentDateTime = () => format(new Date(), "d/M/Y, HH:mm:ss");

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
  socket.emit("botLogs", logs);

  // Leave the room if the user closes the socket
  socket.on("disconnect", () => {
    socket.leave(roomId);
  });
};

export const startBot = async (req, res, next) => {
  res.send("Bot started");

  await saveParamsToFile(req.body);

  await openBrowser(req.body.headless, req.body.developmentMode);

  if (shouldStopBot) {
    shouldStopBot = false;
    await closeBrowser(browser);
    logAndEmitToRoom(`${getCurrentDateTime()} ➤ BOT WELL STOPPED`);

    return;
  }

  await openPage();

  if (shouldStopBot) {
    shouldStopBot = false;
    await closeBrowser(browser);
    logAndEmitToRoom(`${getCurrentDateTime()} ➤ BOT WELL STOPPED`);

    return;
  }

  await openLoginForm();

  await login(req.body.email, req.body.password);

  if (shouldStopBot) {
    shouldStopBot = false;
    await closeBrowser(browser);
    logAndEmitToRoom(`${getCurrentDateTime()} ➤ BOT WELL STOPPED`);

    return;
  }

  await moveToMeetupSection();

  await setSearchParams(req.body.city, req.body.detectionRadius);

  if (shouldStopBot) {
    shouldStopBot = false;
    await closeBrowser(browser);
    logAndEmitToRoom(`${getCurrentDateTime()} ➤ BOT WELL STOPPED`);

    return;
  }

  let shouldStop = await scrapMembers(
    page,
    req.body.minimumAge,
    req.body.maximumAge,
    req.body.city
  );
  if (shouldStop) {
    shouldStopBot = false;
    await closeBrowser(browser);
    logAndEmitToRoom(`${getCurrentDateTime()} ➤ BOT WELL STOPPED`);

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
  if (shouldStop) {
    shouldStopBot = false;
    await closeBrowser(browser);
    logAndEmitToRoom(`${getCurrentDateTime()} ➤ BOT WELL STOPPED`);
    return;
  }

  await closeBrowser(browser);

  //TODO: announce to the client the work is done then he can set isRunning to false
  // io.to(roomId).emit("done", `${getCurrentDateTime()} ➤ WORK DONE`);
};

const logAndEmitToRoom = (logString, isSendingMessagesSentCounter = false) => {
  console.log(logString);
  if (isSendingMessagesSentCounter) {
    logs = [...logs.slice(0, -1), logString];

    io.to(roomId).emit("botLogsMessageSent", logString);
  } else {
    logs.push(logString);

    io.to(roomId).emit("botLogs", logString);
  }
};

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

  logAndEmitToRoom(
    `${getCurrentDateTime()} ➤ WELL CONNECTED WITH ${process.env.EMAIL}`
  );
};

const moveToMeetupSection = async () => {
  // Navigate to the meetup section
  await page.goto(process.env.MEETUP_SECTION_URL);

  logAndEmitToRoom(`${getCurrentDateTime()} ➤ MOVED TO MEETUP SECTION`);

  await page.waitForTimeout(4000); //TODO: check what's better to do
};

const setSearchParams = async (city, detectionRadius) => {
  // Set the location
  await page.type("#autocomplete", city);

  await page.waitForTimeout(2000);

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

  while (citySelected === "") {
    await sleep(500);
  }

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
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const scrapMembers = async (page, minAge, maxAge, city) => {
  // Get all members profile page url (present on the page)
  // TODO: check other page if pagination exists
  const profilesHrefs = await page.$$eval("a", (hrefs) =>
    hrefs.map((a) => a.href).filter((link) => link.includes("/en/workawayer/"))
  );
  // TODO: check if there is a better way to do
  // Using a set to remove dupplicates
  const profilesHrefsWithoutDupplicates = new Set(profilesHrefs);
  // Using an array again
  const finalProfilesHrefsArray = [...profilesHrefsWithoutDupplicates];

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

    await page.goto(
      process.env.MESSAGE_FORM_URL + membersDataScrapped[index].idForMessage
    );

    if ((await page.$("#conversationcontainer")) === null) {
      await page.type("#subject", messageSubject);

      if (membersDataScrapped[index].from.includes("France")) {
        await page.type("#message", frenchMessage);
      } else {
        await page.type("#message", englishMessage);
      }

      await page.keyboard.press("Tab");

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

// TODO: logs
export const getFilesName = (req, res, next) => {
  const filesName = fs
    .readdirSync("./dist")
    .filter((file) => file.includes("json"));

  res.send(filesName);
};

export const deleteFile = (req, res, next) => {
  try {
    fs.unlinkSync(`./dist/${req.query.name}`);

    res.send("ok");
  } catch (err) {
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
