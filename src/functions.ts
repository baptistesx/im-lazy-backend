const puppeteer = require("puppeteer");
const fs = require("fs");

let browser;
let page;
let membersDataScrapped = [];

// Stepper functions linked to express routes

export const startBrowserAndLogin = async (req, res, next) => {
  res.send("Opening browser and login...");

  await openBrowser(req.body.headless);

  await openPage();

  await openLoginForm();

  await login(req.body.email, req.body.password);

  await moveToMeetupSection();
};

export const setSearchCityParams = async (req, res, next) => {
  res.send("setting city params...");

  // Set the location
  await page.type("#autocomplete", process.env.CITY);
  await page.waitForTimeout(2000); //TODO: check what's better to do

  const [location] = await page.$x(
    `//a[contains(., '${process.env.CITY_COUNTRY}')]`
  );
  if (location) {
    await location.click();
  }
  await page.waitForTimeout(2000); //TODO: check what's better to do

  console.log(`-> CITY SET TO ${process.env.CITY}`);

  // Change radius detection around current location
  await page.select('select[name="distance"]', process.env.RADIUS_DETECTION);
  console.log(`-> DETECTION RADIUS SET TO ${process.env.RADIUS_DETECTION}km`);
};

export const setSearchAdditionnalParams = async (req, res, next) => {
  res.send("setting additionnal params");
};

export const setMessages = async (req, res, next) => {};

export const scrapAndMessageMembers = async (req, res, next) => {};

export const startBot = async (req, res, next) => {
  await saveParamsToFile(req.body);

  await openBrowser(req.body.headless);
  res.send("Bot started");

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

  // await closeBrowser(browser);
};

const saveParamsToFile = async (params) => {
  fs.writeFile(process.env.PARAMS_FILE, JSON.stringify(params), (err) => {
    if (err) throw err;
    console.log(`-> PARAMS FILE WRITTEN`);
  });
};

const openBrowser = async (isHeadless) => {
  // const headlessON = parseInt(process.env.HEADLESS);

  browser = await puppeteer.launch({ headless: isHeadless });
  //   console.log(browser)
  console.log(`-> HEADLESS: ${isHeadless ? "ON" : "OFF"}`);
};

const openPage = async () => {
  page = await browser.newPage();

  await page.goto(process.env.SITE_URL);
  console.log(`-> SITE LOADED (${process.env.SITE_URL})`);
};

const openLoginForm = async () => {
  // Open dropdown menu
  await page.click(".dropdown");

  // Click on "Login as a workawayer"
  await page.click('[data-who*="w"]');

  // Wait for the login popup form appears
  // TODO: check if better to use waitForSelector ()
  await page.waitForTimeout(2000); //TODO: check?
  console.log(`-> LOGIN FORM OPENED`);
};

const login = async (email, password) => {
  // let pass = process.env.PASSWORD;
  // let email = process.env.EMAIL;

  await page.type('[data-login*="user"]', email);
  await page.type('[type*="password"]', password);
  console.log(`-> LOGIN FORM FILLED`);

  await page.keyboard.press("Enter");

  await page.waitForNavigation();

  console.log(`-> WELL CONNECTED WITH ${process.env.EMAIL}`);
};

const moveToMeetupSection = async () => {
  // Navigate to the meetup section
  await page.goto(process.env.MEETUP_SECTION_URL);
  console.log("-> MOVED TO MEETUP SECTION");

  await page.waitForTimeout(4000); //TODO: check what's better to do
};

const setSearchParams = async (city, detectionRadius) => {
  // Set the location
  // await page.type("#autocomplete", process.env.CITY);
  await page.type("#autocomplete", city);
  await page.waitForTimeout(2000); //TODO: check what's better to do

  const [location] = await page.$x(
    `//a[contains(., '${process.env.CITY_COUNTRY}')]`
  );
  if (location) {
    await location.click();
  }
  await page.waitForTimeout(2000); //TODO: check what's better to do

  console.log(`-> CITY SET TO ${city}`);

  // Change radius detection around current location
  await page.select('select[name="distance"]', detectionRadius.toString());
  console.log(`-> DETECTION RADIUS SET TO ${detectionRadius}km`);
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

  // const ageMin = parseInt(minAge);
  // const ageMax = parseInt(maxAge);
  const ageRange = range(parseInt(minAge), parseInt(maxAge));

  // TODO: check if better iterating loop (knowing that there are await in the loop)
  for (let i = 0; i < finalProfilesHrefsArray.length; i++) {
    // TODO: to uncomment
    //TODO: to delete next line
    // for (let i = 0; i < 10; i++) {
    let href = finalProfilesHrefsArray[i];

    // Navigate to profile page
    await page.goto(href);
    const sections = await page.$$eval(".media-body", (nodes) => {
      return nodes.map((node) => {
        const h2 = node.querySelector("h2");
        return h2?.textContent === "Age"
          ? parseInt(node.querySelector("p").textContent)
          : "";
      });
    });

    // Extract the members age
    const age = sections.find((e) => e !== "");

    // Check if members age is in the valid range, if not do nothing
    if (ageRange.includes(age)) {
      // Extract members id
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
    }
  }

  console.log("-> ALL MEMBERS HAVE BEEN SCRAPPED");
  //TODO: save to file? return to frontend?
  const resultFile = `dist/${city}_members.json`;
  fs.writeFile(
    resultFile,
    JSON.stringify({ members: membersDataScrapped }),
    (err) => {
      if (err) throw err;
      console.log(`-> RESULTS SAVE to ${resultFile}`);
    }
  );
  // console.log(membersDataScrapped);
};

const sendMessageToMembers = async (
  page,
  messageSubject,
  englishMessage,
  frenchMessage,
  city
) => {
  // Send message to scrapped members
  for (var index in membersDataScrapped) {
    await page.goto(
      process.env.MESSAGE_FORM_URL + membersDataScrapped[index].idForMessage
    );

    if ((await page.$("#conversationcontainer")) === null) {
      // TODO: fix issue: subject text is going in #message if #subject not found
      await page.type("#subject", messageSubject);

      if (membersDataScrapped[index].from.includes("France")) {
        await page.type("#message", frenchMessage);
      } else {
        await page.type("#message", englishMessage);
      }

      // TODO: click on send button
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      membersDataScrapped[index].messageSent = true;
      await page.waitForTimeout(1000); //TODO: check what's better to do

      const resultFile = `dist/${city}_members.json`;

      fs.writeFile(
        resultFile,
        JSON.stringify({ members: membersDataScrapped }),
        (err) => {
          if (err) throw err;
          console.log(`-> RESULTS FILE UPDATES`);
        }
      );
    }
  }
  console.log(`-> ${membersDataScrapped.length} MESSAGES HAVE BEEN SENT`);
};

const closeBrowser = async (browser) => {
  await browser.close();
  console.log("-> BROWSER CLOSED");
};

function range(start, end) {
  return Array(end - start + 1)
    .fill(end - start + 1)
    .map((_, idx) => start + idx);
}
