require("dotenv").config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get("/persons", (req, res) => {
  res.send("test ok");
});

app.listen(4999);

(async () => {
  const headlessON = parseInt(process.env.HEADLESS);

  const browser = await puppeteer.launch({ headless: headlessON });
  console.log(`-> HEADLESS: ${headlessON ? "ON" : "OFF"}`);
  const page = await browser.newPage();

  await page.goto(process.env.SITE_URL);
  console.log(`-> SITE LOADED (${process.env.SITE_URL})`);

  // Open dropdown menu
  await page.click(".dropdown");

  // Click on "Login as a workawayer"
  await page.click('[data-who*="w"]');

  // Wait for the login popup form appears
  // TODO: check if better to use waitForSelector ()
  await page.waitForTimeout(2000); //TODO: check?
  console.log(`-> LOGIN FORM OPENED`);

  let pass = process.env.PASSWORD;
  let email = process.env.EMAIL;

  await page.type('[data-login*="user"]', email);
  await page.type('[type*="password"]', pass);
  console.log(`-> LOGIN FORM FILLED`);

  await page.keyboard.press("Enter");

  await page.waitForNavigation();

  console.log(`-> WELL CONNECTED WITH ${process.env.EMAIL}`);

  // Navigate to the meetup section
  await page.goto(process.env.MEETUP_SECTION_URL);
  console.log("-> MOVED TO MEETUP SECTION");

  await page.waitForTimeout(4000); //TODO: check what's better to do

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

  const ageMin = parseInt(process.env.AGE_MIN);
  const ageMax = parseInt(process.env.AGE_MAX);
  const ageRange = range(ageMin, ageMax);

  let membersDataScrapped = [];

  // TODO: check if better iterating loop (knowing that there are await in the loop)
  // for (let i = 0; i < finalProfilesHrefsArray.length; i++) { // TODO: to uncomment
  //TODO: to delete next line
  for (let i = 0; i < 3; i++) {
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
      const id = await page.evaluate(() =>
        document.querySelector("button.btn-danger").getAttribute("data-id")
      );

      // Extract members country
      const pContents = await page.$$eval("p", (nodes) => {
        return nodes.map((node) => node.textContent);
      });
      const country = pContents
        .find((p) => p.includes("From: "))
        .trim()
        .substring(6);

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
      });
    }
  }
  console.log("-> ALL MEMBERS HAVE BEEN SCRAPPED");
  //TODO: save to file? return to frontend?
  // console.log(membersDataScrapped);

  // Send message to scrapped members
  for (var index in membersDataScrapped) {
    await page.goto(
      process.env.MESSAGE_FORM_URL + membersDataScrapped[index].idForMessage
    );

    // TODO: fix issue: subject text is going in #message if #subject not found
    await page.type("#subject", process.env.MESSAGE_SUBJECT);

    if (membersDataScrapped[index].from.includes("France")) {
      await page.type("#message", process.env.MESSAGE_CONTENT_FR);
    } else {
      await page.type("#message", process.env.MESSAGE_CONTENT_EN);
    }

    // TODO: click on send button
  }
  console.log("-> ALL MESSAGES HAVE BEEN SENT");

  // TODO: to uncomment
  // await browser.close();
  // console.log("-> BROWSER CLOSED");
})();

function range(start, end) {
  return Array(end - start + 1)
    .fill(end - start + 1)
    .map((_, idx) => start + idx);
}
