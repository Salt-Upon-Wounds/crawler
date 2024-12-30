const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('node:fs');
 
(async () => { 
  const userDataDir = 'C:\\Users\\User\\AppData\\Local\\Google\\Chrome\\User Data\\'
  const executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'

  // Запуск Puppeteer с указанием userDataDir
  const browser = await puppeteer.launch({
    headless: true, // Запуск не в headless-режиме, чтобы увидеть процесс
    executablePath: executablePath,
    args: [
      `--user-data-dir=${userDataDir}`,
    ],
  });

  const filePath = path.join(__dirname, 'list.txt')
	 
	// Create a new page with the default browser context 
	const page = await browser.newPage()
 
	// Go to the target website 
	await page.goto(
    'https://vsemart.getcourse.ru/teach/control/stream/view/id/339335021?scan=bafc4636-8cc3-486b-b545-752c749fe2e6&scan_id=a4a10f5c-c782-472a-b7f9-aae7766662bc',
  );
  let title = []
  //title.push(await page.evaluate(() => Promise.resolve(document.getElementsByTagName('h1')[0].textContent.trim())))

  async function goDeep() {
    let topics;
    topics = await page.evaluate(() => Promise.resolve(document.querySelectorAll('.training-row').length))

    for (let i = 1; i <= topics; i++) {
      if (i == 18 || i == 17) continue
      const [_, navigation] = await Promise.allSettled([
        page.click(`.training-row:nth-child(${i})`),
        page.waitForNavigation({ timeout: 10000 }),
      ]);
      console.log('training-row ', navigation.status)
      if (navigation.status !== 'fulfilled') continue
      title.push(await page.evaluate(() => Promise.resolve(document.getElementsByTagName('h1')[0].textContent.trim())))

      let lessons;
      lessons = await page.evaluate(() => Promise.resolve(document.querySelectorAll('.lesson-list li').length))

      if (lessons === 0) await goDeep()
      else {
        for (let i = 1; i <= lessons; i++) {
          const [_, navigation] = await Promise.allSettled([
            page.click(`.lesson-list li:nth-child(${i})`),
            page.waitForNavigation({ timeout: 10000 }),
          ]);
          console.log('lesson-list ', navigation.status)
          if (navigation.status !== 'fulfilled') continue
          title.push(await page.evaluate(() => Promise.resolve(document.getElementsByTagName('h2')[0].textContent.trim())))
          console.log(title)
          await Promise.allSettled(page.frames()
            .filter((el) => /^vhplayeriframe-/.test(el._name))
            .map(async (el) => {
              await el.waitForSelector('.vvd-video')
              const content = await el.content()
              const data = content.match(/(?<=createPersonalVideoUrl).*(?=create-personal-video)/);
              //if (data.length === 0) throw new Error('no createPersonalVideoUrl found');
              let str = `${title.join(' / ')}:\n`
              data.forEach((el) => {
                const [id1, id2] = el.split('\\\/').slice(2)
                str += `\thttps://playlist.servicecdn.ru/player/${id1}/${id2}/master.m3u8\n`
              })
              await fs.writeFile(filePath, str, { flag: 'a' },  err => { console.error(err) })
            })
          );
          await page.goBack()
          title.pop()
          console.log(title)
        }
      }

      await page.goBack()
      title.pop()
      console.log(title)
    }
  }

  await goDeep()

	/* const content = await page.content();
  await fs.writeFile(filePath, content, { flag: 'a' },  err => { console.error(err) }); */

	await browser.close();
})()
