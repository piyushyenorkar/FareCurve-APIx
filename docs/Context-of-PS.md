SIH26056 — Airfare Price Index (APIx)

What they're literally asking for (line by line):

A scraper that pulls live fares 
 5 airlines (IndiGo, Air India, Air India Express, Akasa, SpiceJet) + OTAs (MakeMyTrip, Yatra, EaseMyTrip, Cleartrip, Ixigo, Goibibo)
Fixed basket of city-pairs (DEL-BOM, DEL-BLR, BOM-BLR, DEL-CCU, BLR-HYD, MAA-DEL) — pick ones with highest DGCA traffic
Capture fares at 5 booking windows: T+1, T+7, T+15, T+30, T+45 days out
Clean the data: strip taxes/UDF/convenience fees from base fare, handle sold-out/cancelled flights, remove outliers
Build an actual index number (they explicitly say "PSD" — price/quantity-weighted index, similar methodology to how CPI itself is constructed) at daily/weekly/monthly frequency
Dashboard: price trend lines, sector-wise heatmap, "lead-time elasticity" curves (how price changes as booking date approaches departure)
Expose an API so NSO/RBI can pull the index programmatically
Validate: back-test 30 days of your index against DGCA's published monthly average fares — if your numbers track theirs, you've proven the concept works

Why the government actually needs this: RBI sets interest rates using CPI inflation data. Air travel is in the "Transport & Communication" CPI sub-group, but current fare data is collected manually and misses dynamic pricing entirely — RBI is setting monetary policy on stale/wrong inflation inputs for this category. This isn't a nice-to-have dashboard, it's a real gap in India's inflation-measurement infrastructure. That's a strong, credible impact story for your PPT.

Your USP options (pick one to be your headline):

"Existing CPI collection is manual and point-in-time; we capture the entire dynamic pricing curve across advance-booking windows, which manual collection structurally cannot do" — this is the strongest one because it's a category-level gap, not a speed improvement
Anti-bot resilience angle: session rotation + CAPTCHA-aware scraping architecture designed for longevity (mention rate-limiting/robots.txt compliance explicitly in the deck — MoSPI will care about this being ethical/sustainable, not a scraper that gets IP-banned in week two)
Index-construction rigor: weighting methodology tied to actual DGCA passenger-traffic volume (not equal-weighting every route) — shows statistical seriousness

Implementation level: Web only, no app needed. This is a backend-heavy, data-pipeline problem — the frontend is just a dashboard for policy analysts at NSO/RBI, not a consumer-facing tool. Build:

Scraping layer: Python (Playwright/Selenium for JS-rendered pages)
Storage: Postgres/TimescaleDB (time-series fare data)
Index computation: Python/pandas job, scheduled
Dashboard: React + a charting lib (Recharts/Plotly), or even a Streamlit/Next.js admin panel — doesn't need to be consumer-polished, needs to look analytically credible
API: FastAPI exposing index endpoints

Feasibility flag: Real scraping against 5 airlines + 6 OTAs live, with CAPTCHA/anti-bot handling, in 36 hours is genuinely hard to fully build — but you don't need to. For the PPT/prototype stage, scrape 2-3 sources for real, mock/simulate the rest with realistic data, and be upfront in the architecture slide that the scraper is "designed to scale to all 11 sources" with a plugin-per-source pattern. Judges care that the architecture is sound and one pipeline actually works end-to-end.


Sabse pehle — poora scene kya hai (background)

Government har mahine ek number nikaalti hai jise CPI kehte hain.

CPI = Consumer Price Index
Simple matlab: ye ek number hai jo batata hai ki cheezon ke daam (prices) overall kitna badhe ya ghate — jaise aaj tel, sabzi, bus ticket, flight ticket sab milake average kitna mehenga hua pichle mahine se. Isी se inflation (mehengai) measure hoti hai.

NSO = National Statistical Office
Ye government ka department hai jo ye CPI number calculate karta hai, matlab jo log ye kaam karte hain.

MoSPI = Ministry of Statistics and Programme Implementation
NSO isी ministry ke andar aata hai. Simple bol toh — ye poora ministry hai jiska kaam hi data aur statistics sambhalna hai.

RBI = Reserve Bank of India
India ka central bank. RBI ka kaam hai interest rates (loan pe kitna interest lagega) set karna. Aur RBI ye decide karne ke liye CPI (mehengai ka number) dekhta hai. Matlab: agar CPI ka data galat hai, toh RBI ka decision bhi galat ho sakta hai. Ye connection important hai — isliye ye problem "sirf ek app banana" nahi hai, ye seedha desh ki economy se juda hai.

Ab actual problem kya hai

CPI mein ek category hai "Transport" — usmein flight ke tickets ka price bhi count hota hai.

Lekin abhi jo tareeka hai flight prices collect karne ka wo purana aur manual hai — koi banda kabhi-kabhi kisi ek ticket counter pe jaake price check karta hai. Ye galat hai kyunki:

Aaj 90% log flight tickets online book karte hain — airline website ya OTA se
OTA = Online Travel Aggregator — matlab MakeMyTrip, Goibibo, Ixigo jaise apps/websites jo alag-alag airlines ke tickets ek jagah dikhate hain
Flight ka price ek hi din mein 200-400% tak upar-neeche ho sakta hai — depend karta hai kitne din pehle book kiya, weekend hai ya nahi, festival hai ya nahi

Toh manual collection is completely miss kar raha hai ki asal mein log kitne mein ticket kharid rahe hain. CPI ka flight-price data galat/purana hai.

Toh government kya chahti hai (kya banana hai)

Ek automatic system jo daily khud flight prices nikaale internet se, aur ek naya, sahi number banaye — jise wo APIx (Airfare Price Index) bol rahe hain.

Char cheezein banani hain, step by step:

Step 1 — Scraper (data nikaalne wala tool)
Ek program jo khud-ba-khud airline websites (IndiGo, Air India, SpiceJet, Akasa) aur OTA websites (MakeMyTrip, Goibibo, etc.) pe jaake prices padhta rahe — daily, automatically, bina kisi insaan ke.

Isme kuch technical mushkilein aayengi:

JavaScript-rendered pages: matlab kuch websites ka content turant nahi dikhta, wo load hota hai — toh normal scraping kaam nahi karega, "browser jaisa" tool chahiye (jaise Selenium/Playwright — ye tools hain jo real browser ki tarah website open karke data padhte hain)
CAPTCHA: wo "prove you're not a robot" wala box — websites isse bot ko rokti hain
IP rotation: agar ek hi jagah se baar-baar request bhejoge toh website block kar degi, isliye alag-alag "address" (IP) se request bhejni padti hai

Step 2 — Data saaf karna (cleaning)
Jo raw price milega usme tax, convenience fee sab mila hota hai. Usse alag karna hai — sirf base fare (asli ticket price) nikalna hai. Aur agar koi flight sold-out ya cancel hai, usko handle karna hai.

Step 3 — Index banana (ek number nikalna)
Sab collected prices ko combine karke ek single number banana — jaise CPI khud ek number hai, waise hi tumhara APIx bhi ek number hoga, jo daily/weekly/monthly update hoga.

Step 4 — Dashboard aur API
Ek website/screen jahan graphs dikhein — prices kaise change ho rahe hain route-wise, time ke hisaab se. Aur ek API bhi banani hai — matlab ek "door" jisse NSO/RBI ka apna system tumhare data ko seedha uthake use kar sake, bina manually dekhe.

Ye kya prove karna hai (validation)

Tumhare system se jo number aayega, use DGCA (Directorate General of Civil Aviation — flight-related official data rakhne wali government body) ke already-published monthly average fare data se compare karna hai. Agar tumhara number unke number se milta-julta trend dikhaye, toh proof ho gaya ki tumhara system sahi kaam kar raha hai.

Ek line mein poora concept

Tumhe ek robot banana hai jo roz khud flight ke prices padhe internet se, unhe saaf kare, ek sahi mehengai-number banaye jo AAJ ke real prices dikhaye — na ki purane manual tareeke se — taaki RBI ke paas sahi data ho decision lene ke liye.



USP ka matlab samjhte hain pehle

USP = Unique Selling Point — matlab wo ek cheez jo tumhare solution mein hai jo doosre teams ke solution mein nahi hogi (ya unhone socha nahi hoga). SIH ki PPT mein ek slide hoti hai "How is this different from existing solutions" — judges yahi dekhte hain sabse zyada. Agar ye slide weak hai (sirf "hum AI use karenge" likha hai), toh reject hone ka chance sabse zyada hai.

Is PS (26056) mein USP kya ho sakta hai

Option 1 — Sabse strong: "Booking window ka pura curve capture karna"

Government abhi jo manual tareeka use karti hai, usme wo sirf ek time pe ek price dekhte hain. Lekin flight ka price 45 din pehle alag hota hai, 7 din pehle alag, 1 din pehle alag — same route ka.

Tumhara USP: "Hum sirf ek price nahi lete — hum ek hi route ka price 5 different booking-windows (T+1, T+7, T+15, T+30, T+45) pe track karte hain, jisse pata chalta hai ki price kaise badhta hai time ke saath. Manual collection ye structurally kabhi capture nahi kar sakta."

Ye strong hai kyunki ye ek naya insight de raha hai jo purana system de hi nahi sakta — sirf speed ka improvement nahi hai, ek naye tarah ka data hai.

Option 2 — "Ethical aur sustainable scraping design"

Bahut saare teams scraper banayenge jo 2 din mein hi block ho jayega (website bot detect karke ban kar degi). Tumhara USP: "Humara scraper robots.txt follow karta hai, rate-limiting rakhta hai, aur session-rotation use karta hai — taaki ye long-term chal sake, sirf demo ke liye nahi."

Ye important hai kyunki PS mein khud likha hai "ethical-scraping safeguards" — agar tum ye specifically mention karo apni PPT mein, judges ko lagega tumne poora PS dhyan se padha hai (jo actually bahut kam teams karte hain).

Option 3 — "DGCA traffic-weighted index" (thoda technical dikhne wala point)

Har route ka weight same nahi hona chahiye — jo route zyada log fly karte hain (jaise Delhi-Mumbai), uska weight zyada hona chahiye index banate waqt. Tumhara USP: "Hum equal-weighting nahi karte har route ko — hum DGCA ke actual passenger-traffic data se weight nikaalte hain, jisse index statistically zyada accurate hota hai."

Sabse important baat — konsa lena hai

Teeno points ek saath use karo, lekin Option 1 ko headline banao — kyunki wo sabse unique insight hai jo koi aur team shayad miss kar de.

Shortlist hone ke liye real answer

Ye PS khud low-competition hai — kyunki naam sunte hi "web scraping + statistics" bore/hard lagta hai, toh kam teams isko choose karengi compared to "AI healthcare chatbot" jaisi cheezein jahan hazaaron teams apply karti hain. Isliye tumhare shortlist hone ka relative chance zyada hai — lekin sirf PS choose karne se nahi, tumhari PPT mein clarity, working prototype ka proof (chahe 2-3 routes ka real data ho), aur ye teen USP points clearly likhe hone chahiye.

DGCA ka data aur tumhara system — dono alag cheez hain

DGCA ka data:

Sirf monthly average hota hai — matlab pura mahine ka ek hi average number, route ka
Late aata hai — mahina khatam hone ke baad publish hota hai, real-time nahi
Coarse hai — sirf ek number, ye nahi batata ki 45 din pehle book karne pe price kya tha vs 1 din pehle
Ye CPI banane ke liye direct use nahi hota — CPI abhi bhi manual collection se banta hai (jo hum discuss kar chuke, wo purana/limited tareeka)

Tumhara naya system:

Daily/weekly update hota hai, real-time ke kareeb
Har booking window (T+1, T+7, T+15...) ka alag price dikhata hai
Ye actually usable data banata hai jo CPI mein feed ho sake har mahine, na ki sirf ek mahine baad ka average
Toh DGCA ka data use kyun kar rahe hain phir?

Simple analogy soch — jaise exam mein tumne answer likha, aur teacher ke paas answer-key hai check karne ke liye ki tumhara answer sahi hai ya nahi.

DGCA ka data yahan sirf "answer-key" hai — final product nahi hai.

Tumhara system jo number nikaalega (roz ka, route-wise, booking-window-wise), usko tum compare karoge DGCA ke monthly average se — sirf ye check karne ke liye ki:

"Mera roz ka detailed data, agar mahine bhar mein average nikaalu, toh kya wo DGCA ke already-known monthly number ke kareeb aata hai ya nahi?"

Agar haan → matlab tumhara scraping/cleaning/index-calculation ka poora pipeline sahi kaam kar raha hai, kyunki wo ek known-correct number se match ho raha hai. Ye tumhare liye ek proof/trust-check hai, judges ke liye bhi — "dekho hamara system random numbers nahi de raha, real government data se match ho raha hai."

Toh real cheez jo tum naya bana rahe ho

DGCA sirf 1 number/mahine deta hai. Tum bana rahe ho:

Daily number (na ki monthly)
Route-wise breakdown (na ki overall average)
Booking-window-wise breakdown (jo DGCA bilkul nahi deta — ye completely naya insight hai)
Aur ye sab ek live-updating index ke form mein, jo CPI mein directly feed ho sake

DGCA ka data sirf ye prove karne ke liye use ho raha hai ki tumhara naya, zyada detailed system bhroseymand (trustworthy) hai — final goal wahi nahi hai jo DGCA already deta hai, final goal usse kahi zyada granular aur useful cheez hai.


Pehle 3 wale USP ka quick recap (1-1 line mein)
Booking-window curve — sirf 1 price nahi, 5 different din-pehle-booking (T+1 se T+45) ka price track karna → naya data jo manual system de hi nahi sakta
Ethical scraping — scraper ban na ho jaye isliye rate-limit, robots.txt follow, session-rotation → long-term chalne wala system, sirf demo-jugaad nahi
Traffic-weighted index — Delhi-Mumbai jaisa busy route zyada weight, chhota route kam weight → statistically sahi index (real CPI jaise banti hai waise hi)

Ye teeno solid hain, PPT mein zaroor rakhna. Ab extra USP jo tumhe extra marks dilayenge — kyunki ye cheezein most teams sochenge hi nahi:

Extra USP #1 — "Price Forecast + Buy-Now-or-Wait Suggestion"

Kya hai: Sirf current price dikhana kaafi nahi — ek simple prediction model laga do jo bataye "agle 7 din mein ye route ka price badhega ya ghategaa" based on historical pattern.

Kyun extra marks: Ye tumhe sirf "government ke liye data tool" se aage badhake ek consumer-value-add deta hai — judges ko dikhega ki tumne sirf PS ki minimum requirement pura nahi kiya, aage soch ke kaam kiya. RBI/NSO ke liye bhi useful hai — wo bhi price-trend forecast dekhna chahenge, sirf past data nahi.

Extra USP #2 — "Anomaly/Surge Detection Flag"

Kya hai: Jab kisi route ka price achanak 200-300% upar jaye (festival, demand-surge), system usko automatically flag kare as "anomaly" — na ki chuppe se index mein mila de.

Kyun extra marks: PS khud mention karta hai "outliers remove karna" — lekin tum ek step aage jaake unhe sirf remove nahi, classify karo (genuine surge vs data-error). Ye dikhata hai tumhara system sirf dumb-scraper nahi, thoda intelligent hai. RBI ke liye bhi useful — unhe pata chalega kab price genuinely bahar-market-force se badha (jaise fuel price) vs kab koi glitch hai.

Extra USP #3 — "Base Fare vs Tax/Surcharge Transparency Dashboard"

Kya hai: Dashboard mein saaf dikhana — kitna base fare hai, kitna tax hai, kitna "convenience fee" hai — alag-alag breakdown.

Kyun extra marks: Ye ek transparency angle deta hai jo policy-makers directly use kar sakte hain — jaise "airlines convenience fee kitna badha rahi hain" ye pattern bhi CPI-analysis ke liye useful insight hai, na sirf total price.

Extra USP #4 — "Confidence Score/Data-Quality Indicator"

Kya hai: Har index number ke saath ek chhota "confidence %" bhi dikhao — jaise "is hafte humne 95% routes se data collect kiya, isliye ye number high-confidence hai" ya "kal ek website down thi, isliye ye number thoda kam reliable hai."

Kyun extra marks: Ye ek statistical maturity ka signal hai jo bahut kam student teams sochte hain. Real government/RBI-grade systems mein ye hamesha hota hai — "kitna trust karein is number pe." Judges (especially agar koi statistics-background wala mentor hai) isko turant appreciate karenge.

Extra USP #5 — "Fuel Price (ATF) Correlation Layer"

Kya hai: Airfare ka ek bada reason hota hai ATF (Aviation Turbine Fuel — jahaz ka fuel) ka price. Agar tum apne index ke saath ATF price ka trend bhi side-by-side dikhao, toh judges ko dikhega ki price kyun badha — sirf "badha" nahi, "isliye badha."

Kyun extra marks: Ye tumhare index ko sirf ek "number" se ek explainable insight bana deta hai — jo PPT mein ek bahut strong visual/graph ban sakta hai (do lines saath mein badhte dikhna — ATF price aur airfare price — correlation clearly dikhega).




T ka matlab

T = Travel Date (ya "Trigger date" bol sakte ho) — matlab jis din flight hai, wahi date.

+1, +7, +15, +30, +45 = kitne din pehle tumne ticket book kiya, us travel date se.

Example se samjho

Maan lo flight hai 15 October ko Delhi se Mumbai.

T+1 = matlab tumne ticket book kiya 14 October ko (travel date se sirf 1 din pehle) → last-minute booking, price usually sabse zyada hota hai
T+7 = ticket book kiya 8 October ko (7 din pehle)
T+15 = ticket book kiya 30 September ko (15 din pehle)
T+30 = ticket book kiya 15 September ko (30 din pehle)
T+45 = ticket book kiya 31 August ko (45 din pehle) → sabse advance booking, price usually sabse kam hota hai
Isko is PS mein kyun use kar rahe hain

Same route (jaise Delhi-Mumbai, same 15 October ki flight) ka price alag-alag hota hai depend karta hai kitne din pehle book kiya:

Kab book kiya	Price (example)
45 din pehle (T+45)	₹4,000
30 din pehle (T+30)	₹4,500
15 din pehle (T+15)	₹5,500
7 din pehle (T+7)	₹7,000
1 din pehle (T+1)	₹12,000

Dekho — same flight, same route, lekin price 3x tak badh gaya sirf isliye kyunki kab book kiya wo alag tha.

Tumhara system ko in 5 alag points pe price track karna hai, har route ke liye, roz — taaki ye poora "curve" (price kaise badhta hai time ke saath) capture ho sake. Yahi wo USP tha jo maine pehle bataya tha — manual system sirf ek random time pe ek price dekhta hai, lekin tum ye poora pattern capture kar rahe ho.



