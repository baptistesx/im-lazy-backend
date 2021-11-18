const puppeteer = require("puppeteer");
const fs = require("fs");
const range = require("./utils").range;
var socketsArray = [];
let browser;
let page;
let membersDataScrapped = [];

export const initSocket = async (socket) => {
  socketsArray.push(socket);
  console.log("new client connected");
  socket.emit("connection", "➤ CONNECTED TO BACKEND API");
};

export const startBot = async (req, res, next) => {
  res.send("Bot started");

  await saveParamsToFile(req.body);

  await openBrowser(req.body.headless);

  await openPage();

  await openLoginForm();

  await login(req.body.email, req.body.password);

  await moveToMeetupSection();

  await setSearchParams(req.body.city, req.body.detectionRadius);

  await scrapMembers(
    page,
    req.body.minimumAge,
    req.body.maximumAge,
    req.body.city
  );

  await sendMessageToMembers(
    page,
    req.body.messageSubject,
    req.body.englishMessage,
    req.body.frenchMessage,
    req.body.city
  );

  await closeBrowser(browser);
};

const saveParamsToFile = async (params) => {
  await fs.writeFile(process.env.PARAMS_FILE, JSON.stringify(params), (err) => {
    if (err) {
      throw err;
    }

    console.log(`➤ PARAMS FILE WRITTEN`);
    socketsArray[0].emit("botLogs", "➤ PARAMS FILE WRITTEN");
  });
};

const openBrowser = async (isHeadless) => {
  browser = await puppeteer.launch({ headless: isHeadless });

  console.log(`➤ HEADLESS: ${isHeadless ? "ON" : "OFF"}`);
  socketsArray[0].emit("botLogs", `➤ HEADLESS: ${isHeadless ? "ON" : "OFF"}`);
};

const openPage = async () => {
  page = await browser.newPage();

  await page.goto(process.env.SITE_URL);

  console.log(`➤ SITE LOADED (${process.env.SITE_URL})`);
  socketsArray[0].emit("botLogs", `➤ SITE LOADED (${process.env.SITE_URL})`);
};

const openLoginForm = async () => {
  // Open dropdown menu
  await page.click(".dropdown");

  // Click on "Login as a workawayer"
  await page.click('[data-who*="w"]');

  // Wait for the login popup form appears
  // TODO: check if better to use waitForSelector ()
  await page.waitForTimeout(2000); //TODO: check?

  console.log(`➤ LOGIN FORM OPENED`);
  socketsArray[0].emit("botLogs", `➤ LOGIN FORM OPENED`);
};

const login = async (email, password) => {
  await page.type('[data-login*="user"]', email);
  await page.type('[type*="password"]', password);

  console.log(`➤ LOGIN FORM FILLED`);
  socketsArray[0].emit("botLogs", `➤ LOGIN FORM FILLED`);

  await page.keyboard.press("Enter");

  await page.waitForNavigation();

  console.log(`➤ WELL CONNECTED WITH ${process.env.EMAIL}`);
  socketsArray[0].emit("botLogs", `➤ WELL CONNECTED WITH ${process.env.EMAIL}`);
};

const moveToMeetupSection = async () => {
  // Navigate to the meetup section
  await page.goto(process.env.MEETUP_SECTION_URL);

  console.log("➤ MOVED TO MEETUP SECTION");
  socketsArray[0].emit("botLogs", "➤ MOVED TO MEETUP SECTION");

  await page.waitForTimeout(4000); //TODO: check what's better to do
};

const setSearchParams = async (city, detectionRadius) => {
  // Set the location
  await page.type("#autocomplete", city);

  await page.waitForTimeout(2000); //TODO: check what's better to do

  const [location] = await page.$x(
    `//a[contains(., '${process.env.CITY_COUNTRY}')]`
  );
  if (location) {
    await location.click();
  }
  await page.waitForTimeout(2000); //TODO: check what's better to do

  console.log(`➤ CITY SET TO ${city}`);
  socketsArray[0].emit("botLogs", `➤ CITY SET TO ${city}`);

  // Change radius detection around current location
  await page.select('select[name="distance"]', detectionRadius.toString());

  console.log(`➤ DETECTION RADIUS SET TO ${detectionRadius}km`);
  socketsArray[0].emit(
    "botLogs",
    `➤ DETECTION RADIUS SET TO ${detectionRadius}km`
  );
};

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

  console.log(`➤ TOTAL MEMBERS IN THE AREA: ${finalProfilesHrefsArray.length}`);
  socketsArray[0].emit(
    "botLogs",
    `➤ TOTAL MEMBERS IN THE AREA: ${finalProfilesHrefsArray.length}`
  );

  console.log(`➤ START SCRAPPING...`);
  socketsArray[0].emit("botLogs", `➤ START SCRAPPING...`);

  // TODO: check if better iterating loop (knowing that there are await in the loop)
  for (let i = 0; i < finalProfilesHrefsArray.length; i++) {
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

      console.log(`➤ #${i} SCRAPPED`);
      socketsArray[0].emit("botLogsMembersScrapped", `➤ #${i} SCRAPPED`);
    }
  }

  console.log("➤ ALL MEMBERS HAVE BEEN SCRAPPED");
  socketsArray[0].emit("botLogs", "➤ ALL MEMBERS HAVE BEEN SCRAPPED");

  console.log(`➤ ${membersDataScrapped.length} MEMBERS IN THE AGE RANGE`);
  socketsArray[0].emit(
    "botLogs",
    `➤ ${membersDataScrapped.length} MEMBERS IN THE AGE RANGE`
  );

  //TODO: add option to download this file from the frontend?
  const resultFile = `dist/${city}_members.json`;

  await fs.writeFile(
    resultFile,
    JSON.stringify({ members: membersDataScrapped }),
    (err) => {
      if (err) throw err;
      console.log(`➤ RESULTS SAVE to ${resultFile}`);
      socketsArray[0].emit("botLogs", `➤ RESULTS SAVE to ${resultFile}`);
    }
  );
};

const sendMessageToMembers = async (
  page,
  messageSubject,
  englishMessage,
  frenchMessage,
  city
) => {
  console.log("➤ START SENDING MESSAGES");
  socketsArray[0].emit("botLogs", "➤ START SENDING MESSAGES");

  // Send message to scrapped members
  for (var index in membersDataScrapped) {
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

      // TODO: comment next line when testing to not send real messages
      // await page.keyboard.press("Enter");
      membersDataScrapped[index].messageSent = true;

      await page.waitForTimeout(1000); //TODO: check what's better to do

      const resultFile = `dist/${city}_members.json`;

      await fs.writeFile(
        resultFile,
        JSON.stringify({ members: membersDataScrapped }),
        (err) => {
          if (err) throw err;
          const indexWithOffset = parseInt(index) + 1;
          console.log(
            `➤ ${indexWithOffset}/${membersDataScrapped.length} MESSAGES SENT`
          );
          socketsArray[0].emit(
            "botLogsMessageSent",
            `➤ ${indexWithOffset}/${membersDataScrapped.length} MESSAGES SENT`
          );
        }
      );
    }
  }

  console.log(`➤ ${membersDataScrapped.length} MESSAGES HAVE BEEN SENT`);
  socketsArray[0].emit(
    "botLogs",
    `➤ ${membersDataScrapped.length} MESSAGES HAVE BEEN SENT`
  );
};

const closeBrowser = async (browser) => {
  await browser.close();

  console.log("➤ BROWSER CLOSED");
  socketsArray[0].emit("botLogs", "➤ BROWSER CLOSED");
};
