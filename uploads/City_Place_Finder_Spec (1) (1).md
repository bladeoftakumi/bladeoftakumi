# City Place Finder

_Program specification: Quran schools and Islamic centres, city by city, to Excel_

## 1. Purpose

City Place Finder takes a list of US cities and a list of keywords, searches Google Maps for each keyword across the whole of each city, and returns one Excel workbook per city. Each workbook lists every place found once, with its address, city, state, ZIP, coordinates, phone number, website and any email address the program can find.

It is built for a short, one-off targeting test, not as a permanent database. The output is meant to be reviewed, filtered and then used for geo-targeted ads or passed to an AI agent for further processing.

## 2. What it does, end to end

1. **Accepts any number of cities.** The user types them in as “City, ST”, one per line. There is no fixed limit; the cost estimate and call cap (section 4) are what keep a large run under control.

2. **Accepts keywords.** The user enters the search keywords to run, for example Quran school, Islamic studies, hifz. Every keyword is searched in every area of every city.

3. **Confirms each city.** The program looks up each city’s boundary box and shows it on a map, so the user can catch mistakes (for example Vancouver WA versus Vancouver BC) before anything is spent.

4. **Shows the cost before running.** It shows the estimated number of API calls for a complete run, the estimated cost in dollars, and a call limit the user can raise or lower. It waits for the user to press Start.

5. **Searches each city in pieces.** Because Google returns at most 60 results per search, the city is split into smaller areas and each area is searched separately for each keyword (section 5).

6. **Removes duplicates as it goes.** Every place has a unique Google place ID. A place found by several searches or several areas is kept once, with a note of which keywords found it.

7. **Collects contact details.** For each unique place it fetches phone number and website, then visits the website to look for an email address (section 6).

8. **Separates out junk.** Obvious non-matches such as halal grocers and restaurants are moved to a separate sheet, not deleted (section 7).

9. **Writes one Excel file per city,** plus an optional combined file of all cities, and makes them available to download.

## 3. Inputs

### Cities

A text box accepting any number of lines in the form “City, ST”. It also accepts a pasted list, for example a column copied from a spreadsheet. A counter shows how many cities have been entered. Each city is checked when the user moves on: if the lookup fails or returns more than one plausible match, that line is highlighted and the user must fix it before continuing.

### Keywords

A separate box where the user types the keywords to search, one per line or separated by commas. Each keyword becomes its own search query in every area of every city, so “Quran school” and “hifz” are run separately and their results merged.

The box starts pre-filled with Quran school and Islamic studies, which the user can edit or delete. Below it, a row of suggestions (hifz school, Islamic school, Islamic center, masjid, madrasa) can be added with one click. Duplicate keywords are removed, and the cost estimate updates as soon as a keyword is added or removed, since each keyword roughly multiplies the number of searches.

### Options

- **Fetch phone and website** (on by default).

- **Look for emails on websites** (on by default).

- **Keep places just outside the city** (off by default). The search box is a rectangle, so it catches parts of neighbouring towns. When off, those rows go to the Excluded sheet with the reason “Outside city”.

- **Call limit for this run.** Set on the cost panel (section 4). The run stops cleanly if it reaches this number.

### API key

The setup screen has a field where the user pastes their Google Maps API key at the start of every run. The key is used for that run only and is never stored.

- The field is masked like a password, with a button to show it briefly for checking.

- A Check key button makes one test call and reports the result in plain language, for example “Key works, Places API enabled” or “Places API is not enabled on this key’s project”. The Start button stays disabled until the key has passed this check.

- The key is held only in memory while the run is going. It is not saved to disk, a settings file, the progress file, the browser’s storage, any output file or any log, and error messages never repeat it.

- When the run finishes, is stopped, or the app is closed, the key is cleared. The next run asks for it again.

- Resuming an unfinished run also asks for the key again, since the saved progress does not include it.

## 4. Cost estimate and call limit

Google bills the Maps APIs per request, not in tokens, so the program measures everything in API calls and converts calls to dollars using the per-call prices in its settings file. Before the run, a cost panel on the setup screen shows the following, updating live as cities and keywords change.

| **Item**        | **What it shows**                                                                                |
|-----------------|--------------------------------------------------------------------------------------------------|
| City lookups    | One call per city to find its boundary                                                           |
| Area searches   | Calls to search every area for every keyword, including extra pages and the areas that get split |
| Detail lookups  | One call per unique place, for phone, website and address parts                                  |
| Estimated total | The number of calls for a complete run, with the dollar cost beside it                           |
| Call limit      | An editable number and slider, set by default to the estimated total plus 20% headroom           |

**Why it is an estimate.** The exact number of searches depends on how many places each city has, because busy areas get split and searched again. The program estimates it from each city’s size, then shows it as a range with the most likely figure highlighted, for example “420 calls expected, up to 610”. Email checks visit ordinary websites and cost nothing in API calls.

**Adjusting the limit.** The user can raise or lower the limit before pressing Start. If the limit is below the estimate, the panel says so plainly, for example “This limit covers about 70% of the run. The last cities may be incomplete.” Cities are processed in the order entered, so the user can put the most important ones first.

**During the run.** The running screen shows calls used, calls remaining under the limit, cost so far, and a revised estimate for the rest of the run, which gets more accurate after each city. If the revised estimate goes above the limit, the program pauses and asks whether to raise the limit, stop after the current city, or carry on until the limit is reached.

## 5. Covering the whole city

A single search for “Quran school in Kent, WA” returns at most 60 places, weighted toward the centre and the most prominent results. To reach the full extent of the city, the program searches area by area.

1. Take the city’s boundary box from the lookup in step 2.

2. Search the whole box once for each keyword, restricted to that box.

3. If a search comes back with fewer than 60 results, that area is fully covered for that keyword. Record it and move on.

4. If a search comes back with 60 results, the area probably holds more than Google will show. Split it into four equal quarters and search each quarter.

5. Repeat until every area returns fewer than 60 results, or an area reaches the minimum size (about 500 m across). Areas that hit the minimum size while still full are listed in the run summary as “may be incomplete”.

This adapts to density automatically: a dense downtown gets split finely, while empty suburbs are covered in one or two searches. It uses far fewer calls than a fixed grid.

## 6. Collecting contact details

### Phone and website

The area searches request only the basic fields (place ID, name, address, location, category). Once a city’s searches are finished and duplicates removed, the program requests phone number, website, Google Maps link, business status and address parts for each unique place. Doing this once per place, rather than on every search, keeps the cost down because many places are found several times.

### Email

Google Maps does not provide email addresses. To find them, the program visits each place’s website if it has one:

- It loads the home page and up to three linked pages whose link text or address suggests contact details (Contact, About, Admissions, Register).

- It extracts addresses from mailto links and from visible text, and ignores false matches such as image file names.

- It respects robots.txt, waits up to 10 seconds per page, and moves on if a site fails.

- If the website is only a Facebook, Instagram or WhatsApp link, it does not try to read it and records “Social page only”.

Each email is saved with the page it was found on, so the user can check it. A blank email cell means none was found, not that the place has none.

## 7. Duplicates and junk

### Duplicates

- **Within a city:** the place ID is the key. Each place appears once, with every matching keyword listed in one cell.

- **Across cities:** a place near a boundary can be found from two cities. It goes into the file of the city named in its own address. If that city is not one of the inputs, it goes to the first city that found it, with a note.

- **Possible duplicates:** two different place IDs with the same phone number or the same street address (a masjid and its weekend school listed separately, for example) are both kept and flagged “Possible duplicate”, not merged.

### Junk

Rows are moved to the Excluded sheet, with a reason, when the Google category is clearly unrelated (grocery store, restaurant, clothing store, travel agency and similar), the name contains words such as halal, market, meat, grill or kitchen, the place is marked permanently closed, or the place is outside the city (unless the user kept those). The lists of categories and words live in a settings file the user can edit.

## 8. Output

One workbook per city, named like Kent_WA_2026-09-27.xlsx. An optional All_Cities workbook combines them with a City column.

### Sheet 1: Places

| **Column**           | **Contents**                                                                |
|----------------------|-----------------------------------------------------------------------------|
| Name                 | As listed on Google                                                         |
| Street address       | Street line only                                                            |
| City / State / ZIP   | Three separate columns, taken from the address parts so they filter cleanly |
| Phone                | Stored as text so Excel does not reformat it                                |
| Website              | Clickable link                                                              |
| Email(s)             | Semicolon-separated if more than one                                        |
| Email found on       | The web page the email came from                                            |
| Latitude / Longitude | Two columns, six decimal places                                             |
| Google Maps link     | Clickable                                                                   |
| Matched keywords     | Every keyword that found this place                                         |
| Category             | Google’s place category                                                     |
| Status               | Operational or temporarily closed                                           |
| Flag                 | Possible duplicate, Social page only, Found from another city, or blank     |
| Place ID             | Google’s ID, kept last                                                      |

The header row is frozen, filters are switched on, columns are sized to fit, and empty values are left blank rather than filled with “N/A”.

### Sheet 2: Excluded

Same columns plus a Reason column. Nothing is thrown away silently, so the user can move a row back if the filter got it wrong.

### Sheet 3: Run summary

Date and time, the city as confirmed, keywords used, number of areas searched, API calls made, estimated cost, places found, duplicates merged, rows excluded, emails found, and any areas marked “may be incomplete”.

## 9. Interface

A simple local app that opens in the browser. Plain, neutral styling: system font, greys, one accent colour for buttons and progress. No branding; that will be applied separately.

### Screen 1: Setup

The API key field and its Check key button at the top. The city box with its counter. The keyword box with its suggestions. Options. The cost panel from section 4, with the estimated calls, estimated cost, and the adjustable call limit. A Start button.

### Screen 2: Confirm cities

A map with each city’s boundary box drawn on it and a list alongside. Each city shows a tick or a warning. The user can remove or correct a city here, then confirm.

### Screen 3: Running

The map is the main view. Search areas are drawn as they are processed: grey for waiting, green for done, amber for an area that was split, red for “may be incomplete”. Pins drop onto the map as places are found. Alongside the map: a progress bar per city, live counters (API calls used and remaining, cost so far, revised estimate for the rest of the run, places found, duplicates skipped, emails found), and a scrolling log of what is happening in plain language. Pause, Resume and Stop buttons. Stopping still writes files for whatever has finished.

### Screen 4: Results

One tab per city showing the Places table with sorting and search, the counts from the run summary, and a Download button. A Download all button gives a zip of every workbook. A Delete run data button clears everything the run saved locally.

## 10. Limits, cost and safety

- **Cost control.** The estimate and adjustable limit appear before the run (section 4), and the run stops at the limit. Per-call prices sit in the settings file so they can be updated when Google changes pricing.

- **Resumable.** Progress is saved after every search (without the key). If the app closes or hits the limit, rerunning the same cities with the key re-entered continues where it stopped, without repeating paid calls.

- **Errors.** Temporary failures are retried with increasing waits. Problems the user must fix (key rejected, Places API not enabled, billing off) stop the run with a plain explanation, and the key is cleared.

- **API key.** Entered for each run, held in memory only, and cleared at the end (section 3).

- **Short-term data.** Google’s terms limit keeping Places data long-term, other than place IDs. The program is intended for a short test, and the Delete run data button supports clearing it afterwards.

## 11. Out of scope

Uploading to Meta or any ad platform, syncing to a CRM, contacting any of the places, reading social media pages, and running on a schedule. The Excel files are the end product; anything after that happens outside this program.

## 12. How to tell it works

- Running the same city twice produces the same places.

- No place ID appears twice in any city file, or in more than one city file.

- Every row has an address, city, state and coordinates.

- No searched area is left at 60 results unless it is marked “may be incomplete”.

- The run summary counts match the rows in the Places and Excluded sheets.

- A spot check of 10 random rows against Google Maps shows matching names, addresses and phones.

## 13. Suggested build

Python for the searching and file writing (requests for the API calls, openpyxl for the Excel files), a small local web server, and a browser page using a free map library such as Leaflet for the live map. It runs on the user’s own computer, so the API key goes only from the user’s browser to the local program and from there to Google.

## 14. Build and test order

1. **Test small first.** Build and test the whole flow with one small city and one keyword before running anything larger, so a bug costs a few API calls, not hundreds.

2. **Check the estimate against reality.** After that first test, show the cost estimate the program gave before the run next to the actual number of API calls it used. Only move on to larger runs once the two are close enough to trust.
