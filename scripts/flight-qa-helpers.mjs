import assert from 'node:assert/strict';
export async function waitStationDisembark(page){await page.waitForFunction(()=>!window.__erebus.snapshot().flight&&window.__erebus.snapshot().launchBay.phase==='parked'&&!window.__erebus.snapshot().launchBay.boarded,{},{timeout:90000});}
export async function flyLeg(page){
  await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying',{},{timeout:90000});
  const leg=await page.evaluate(()=>window.__erebus.snapshot().flight.leg);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>window.__erebus.snapshot().flight?.distance<85,{},{timeout:120000});
  await page.keyboard.up('KeyW');await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.__erebus.snapshot().flight?.speed<10,{},{timeout:30000});await page.keyboard.up('Space');
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>!window.__erebus.snapshot().flight,{},{timeout:90000});
  if(leg==='erebus')await waitStationDisembark(page);
  assert.equal(await page.evaluate(()=>window.__erebus.snapshot().onSurface),leg==='nysa');
}
