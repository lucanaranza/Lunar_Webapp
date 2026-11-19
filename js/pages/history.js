/* =====================================================================
   1) STORIA
   ===================================================================== */
const WM = (h, f, w = 240) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${h}/${f}/${w}px-${f}${f.endsWith(".svg") ? ".png" : ""}`;
const HIST = [
  { id: "sv1", name: "Surveyor 1", agency: "NASA", date: "1966-06-02", lat: -2.47, lon: -43.34, place: "Oceanus Procellarum", group: "robotic",
    intro: ["Surveyor 1 era una sonda robotica a tre gambe, grande come un'auto piccola. È stata la prima sonda americana a posarsi dolcemente sulla Luna, tre anni prima degli astronauti.",
            "Surveyor 1 was a three-legged robotic probe about the size of a small car. It was the first American spacecraft to touch down gently on the Moon, three years before the astronauts."],
    why: [["Prima di mandare persone bisognava rispondere a una domanda semplice ma fondamentale: il suolo lunare regge il peso di un veicolo, oppure è una polvere soffice in cui si sprofonda? Serviva quindi un posto «facile», per non confondere un guasto con un problema del terreno.",
           "Before sending people, NASA had to answer a simple but vital question: can the lunar ground hold the weight of a spacecraft, or is it soft dust you sink into? So it needed an “easy” place, so a crash would not be confused with a problem with the ground."],
          ["L'Oceanus Procellarum è un «mare»: una pianura enorme di lava antica solidificata, piatta e con pochi massi. Più il terreno è piatto, meno rischi che la sonda si ribalti.",
           "Oceanus Procellarum is a “mare”: a huge plain of old, hardened lava, flat and with few boulders. The flatter the ground, the lower the risk of the probe tipping over."],
          ["Si trova vicino all'equatore e sul lato della Luna rivolto verso di noi: la Terra è sempre in cielo, quindi i segnali radio arrivano diretti e senza interruzioni.",
           "It lies near the equator on the side of the Moon that faces us: Earth is always in the sky, so radio signals travel straight home without interruption."]],
    alt: ["Gli altopiani, più chiari e pieni di crateri, erano troppo accidentati per una sonda senza pilota che non poteva scansare gli ostacoli. Il lato nascosto era escluso: senza la Terra in vista nessuno avrebbe potuto ricevere i dati.",
          "The highlands, brighter and full of craters, were too rough for an unpiloted probe that could not dodge obstacles. The far side was ruled out: with no Earth in view, nobody could have received the data."],
    legacy: ["Oltre 11 000 foto della superficie e la prova che il terreno era solido. Era il via libera per il modulo lunare dell'Apollo.",
             "More than 11,000 photos of the surface and proof that the ground was solid. It was the green light for the Apollo lunar module."],
    links: [["NASA", "https://science.nasa.gov/mission/surveyor-1/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Surveyor_1"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Surveyor_1"]] },

  { id: "a11", name: "Apollo 11", agency: "NASA", date: "1969-07-20", lat: .674, lon: 23.473, place: "Mare Tranquillitatis", group: "apollo",
    patch: WM("2/27", "Apollo_11_insignia.png"), crew: "Neil Armstrong, Buzz Aldrin, Michael Collins",
    intro: ["La missione in cui per la prima volta due esseri umani, Neil Armstrong e Buzz Aldrin, hanno camminato sulla Luna, mentre Michael Collins li aspettava in orbita. Il modulo lunare si chiamava «Eagle».",
            "The mission in which two humans, Neil Armstrong and Buzz Aldrin, walked on the Moon for the first time, while Michael Collins waited for them in orbit. The lunar module was called “Eagle”."],
    why: [["La regola numero uno era la sicurezza. Il Mare della Tranquillità è una distesa di lava antica, piatta e liscia, con pochi crateri grandi e pochi massi: il posto ideale per un primo atterraggio in cui tutto era nuovo.",
           "Rule number one was safety. The Sea of Tranquillity is an expanse of old lava, flat and smooth, with few large craters and few boulders: the ideal place for a first landing where everything was new."],
          ["È vicino all'equatore lunare. Da lì le traiettorie sono le più semplici e consumano meno carburante, e in caso di emergenza si poteva ripartire e tornare verso la Terra più facilmente.",
           "It is close to the lunar equator. From there the trajectories are the simplest and use the least fuel, and in an emergency it was easier to lift off and head back to Earth."],
          ["È sul lato visibile: la Terra resta sempre sopra l'orizzonte, così Houston poteva parlare con gli astronauti in ogni momento e milioni di persone hanno visto la diretta TV.",
           "It is on the near side: Earth always stays above the horizon, so Houston could talk to the astronauts at any time and millions of people watched the live TV broadcast."],
          ["Si atterrò all'alba lunare, con il Sole basso alle spalle. Così le rocce e i crateri facevano ombre lunghe e si vedevano bene, ma il Sole non accecava gli astronauti e non scaldava troppo il suolo.",
           "They landed at lunar dawn, with the Sun low behind them. That way rocks and craters cast long shadows and were easy to spot, but the Sun did not blind the astronauts or heat the ground too much."],
          ["La zona era già stata fotografata da vicino dalle sonde Ranger, Surveyor e Lunar Orbiter: si sapeva cosa aspettarsi.",
           "The area had already been photographed up close by the Ranger, Surveyor and Lunar Orbiter probes: they knew what to expect."]],
    alt: ["Gli altopiani o i bordi dei grandi crateri erano scientificamente più interessanti, ma troppo rischiosi per la prima volta. Anche così, Armstrong dovette pilotare a mano per evitare un campo di massi e atterrò con meno di un minuto di carburante.",
          "The highlands or the rims of big craters were scientifically more interesting, but too risky for a first attempt. Even so, Armstrong had to fly by hand to avoid a boulder field and landed with less than a minute of fuel left."],
    legacy: ["I primi passi umani su un altro mondo e 21,5 kg di rocce lunari, che hanno mostrato che i mari sono lava vulcanica di circa 3,7 miliardi di anni fa.",
             "The first human steps on another world and 21.5 kg of Moon rocks, which showed that the maria are volcanic lava about 3.7 billion years old."],
    links: [["NASA", "https://www.nasa.gov/mission/apollo-11/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Apollo_11"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Apollo_11"]] },

  { id: "a12", name: "Apollo 12", agency: "NASA", date: "1969-11-19", lat: -3.01, lon: -23.42, place: "Oceanus Procellarum", group: "apollo",
    patch: WM("8/8d", "Apollo_12_insignia.png"), crew: "Pete Conrad, Alan Bean, Richard Gordon",
    intro: ["Quattro mesi dopo Apollo 11, Pete Conrad e Alan Bean tornarono sulla Luna con una sfida nuova: atterrare in un punto preciso, scelto in anticipo.",
            "Four months after Apollo 11, Pete Conrad and Alan Bean returned to the Moon with a new challenge: landing on a precise spot chosen in advance."],
    why: [["Apollo 11 era atterrato a circa 6 km dal punto previsto. Per le missioni future, verso zone più interessanti ma più strette, bisognava dimostrare di saper «parcheggiare» con precisione.",
           "Apollo 11 had landed about 6 km from the planned point. Future missions, heading to more interesting but tighter places, needed proof that the crew could “park” precisely."],
          ["Il bersaglio era perfetto: la sonda Surveyor 3, arrivata nel 1967. Era un oggetto ben visibile da raggiungere, e i suoi pezzi rimasti due anni e mezzo al sole e al vuoto erano un esperimento già pronto.",
           "The target was perfect: the Surveyor 3 probe, which landed in 1967. It was a clearly visible object to aim for, and its parts, after two and a half years of sunlight and vacuum, were a ready-made experiment."],
          ["Era un mare diverso da quello di Apollo 11: confrontando le rocce si poteva capire se le lave lunari avevano tutte la stessa età.",
           "It was a different mare from Apollo 11's: comparing the rocks would show whether all lunar lavas were the same age."]],
    alt: ["Un sito qualsiasi non avrebbe permesso di misurare la precisione: senza un «bersaglio» sul terreno non si poteva dire di quanto si era sbagliato.",
          "Any random site would not have measured precision: without a “target” on the ground there was no way to tell how far off you were."],
    legacy: ["Atterraggio a circa 180 m da Surveyor 3. Gli astronauti ne staccarono la telecamera e la riportarono a Terra. Le rocce erano circa 500 milioni di anni più giovani di quelle di Apollo 11.",
             "Landing about 180 m from Surveyor 3. The astronauts removed its camera and brought it back to Earth. The rocks were about 500 million years younger than Apollo 11's."],
    links: [["NASA", "https://www.nasa.gov/mission/apollo-12/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Apollo_12"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Apollo_12"]] },

  { id: "a14", name: "Apollo 14", agency: "NASA", date: "1971-02-05", lat: -3.65, lon: -17.47, place: "Fra Mauro", group: "apollo",
    patch: WM("d/d7", "Apollo_14-insignia.png"), crew: "Alan Shepard, Edgar Mitchell, Stuart Roosa",
    intro: ["Dopo l'incidente di Apollo 13, che non poté atterrare, Apollo 14 andò nello stesso luogo. Al comando c'era Alan Shepard, il primo americano nello spazio.",
            "After the Apollo 13 accident, which could not land, Apollo 14 went to the same place. In command was Alan Shepard, the first American in space."],
    why: [["Fra Mauro non è un mare: è un terreno collinoso fatto di detriti lanciati lontano dall'enorme impatto che scavò il bacino Imbrium, grande come mezza Europa.",
           "Fra Mauro is not a mare: it is hilly ground made of debris thrown far by the huge impact that dug out the Imbrium basin, as wide as half of Europe."],
          ["Raccogliere quelle rocce significava poter datare l'impatto di Imbrium, un evento chiave per scrivere la storia della Luna. Era il primo passo dalla «sicurezza» alla «scienza».",
           "Collecting those rocks meant being able to date the Imbrium impact, a key event in writing the Moon's history. It was the first step from “safety” to “science”."],
          ["Era l'obiettivo mancato di Apollo 13: la domanda scientifica era ancora lì, e la preparazione era già fatta.",
           "It was Apollo 13's missed target: the scientific question was still open, and the preparation was already done."]],
    alt: ["Un altro mare piatto sarebbe stato più sicuro ma avrebbe insegnato poco di nuovo: le lave erano già state campionate da Apollo 11 e 12.",
          "Another flat mare would have been safer but taught little that was new: lavas had already been sampled by Apollo 11 and 12."],
    legacy: ["Rocce che hanno fissato l'età del bacino Imbrium a circa 3,9 miliardi di anni. E Shepard colpì due palline da golf sulla Luna!",
             "Rocks that set the age of the Imbrium basin at about 3.9 billion years. And Shepard hit two golf balls on the Moon!"],
    links: [["NASA", "https://www.nasa.gov/mission/apollo-14/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Apollo_14"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Apollo_14"]] },

  { id: "a15", name: "Apollo 15", agency: "NASA", date: "1971-07-30", lat: 26.13, lon: 3.63, place: "Hadley–Apennine", group: "apollo",
    patch: WM("e/e5", "Apollo_15-insignia.png"), crew: "David Scott, James Irwin, Alfred Worden",
    intro: ["La prima delle missioni «J», più lunghe e scientifiche: tre giorni sulla Luna e, per la prima volta, un'auto elettrica, il Lunar Roving Vehicle.",
            "The first of the “J” missions, longer and more scientific: three days on the Moon and, for the first time, an electric car, the Lunar Roving Vehicle."],
    why: [["Con il rover gli astronauti potevano percorrere decine di chilometri. Così si poteva scegliere un sito vario, con diversi tipi di terreno vicini tra loro.",
           "With the rover the astronauts could drive tens of kilometres. That made it possible to choose a varied site, with different kinds of terrain close together."],
          ["Da un lato c'erano i Monti Appennini, alti fino a 5 km: crosta antichissima sollevata dall'impatto di Imbrium. Dall'altro la Hadley Rille, un canale lungo e sinuoso scavato dalla lava.",
           "On one side stood the Apennine Mountains, up to 5 km high: very old crust lifted up by the Imbrium impact. On the other lay Hadley Rille, a long, winding channel carved by lava."],
          ["In un solo sito si potevano studiare due grandi capitoli della storia lunare: la crosta primordiale e il vulcanismo.",
           "In a single site they could study two big chapters of lunar history: the primordial crust and volcanism."]],
    alt: ["Era un atterraggio difficile, tra le montagne e con una discesa ripida. Non sarebbe stato possibile senza l'esperienza e la precisione delle missioni precedenti: per questo non era stato scelto prima.",
          "It was a difficult landing, between mountains and with a steep descent. It would not have been possible without the experience and precision of earlier missions: that is why it was not chosen earlier."],
    legacy: ["La «Genesis Rock», un pezzo di crosta lunare primordiale di circa 4 miliardi di anni. E l'esperimento della piuma e del martello che cadono insieme nel vuoto.",
             "The “Genesis Rock”, a piece of primordial lunar crust about 4 billion years old. And the experiment of the feather and the hammer falling together in a vacuum."],
    links: [["NASA", "https://www.nasa.gov/mission/apollo-15/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Apollo_15"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Apollo_15"]] },

  { id: "a16", name: "Apollo 16", agency: "NASA", date: "1972-04-21", lat: -8.97, lon: 15.50, place: "Descartes", group: "apollo",
    patch: WM("6/66", "Apollo-16-LOGO.png"), crew: "John Young, Charles Duke, Ken Mattingly",
    intro: ["L'unica missione Apollo atterrata negli altopiani centrali, le zone chiare della Luna che vediamo anche a occhio nudo.",
            "The only Apollo mission to land in the central highlands, the bright areas of the Moon we can see with the naked eye."],
    why: [["Gli altopiani coprono la maggior parte della Luna, ma nessuno ci era ancora atterrato. Senza quei campioni la storia lunare restava a metà.",
           "Highlands cover most of the Moon, but nobody had landed there yet. Without those samples the Moon's story was only half told."],
          ["Dalle foto sembravano colline di origine vulcanica, diverse dalla lava scura dei mari. Descartes era il posto migliore per verificarlo.",
           "From photos they looked like hills of volcanic origin, different from the dark lava of the maria. Descartes was the best place to check."],
          ["Era abbastanza vicino all'equatore e raggiungibile con il rover dai punti di interesse principali.",
           "It was close enough to the equator and the main points of interest were within rover reach."]],
    alt: ["Restare nei mari, più sicuri, avrebbe lasciato senza risposta la domanda più grande: di che cosa è fatta la parte chiara della Luna?",
          "Staying in the maria, which were safer, would have left the biggest question unanswered: what is the bright part of the Moon made of?"],
    legacy: ["Sorpresa: non erano vulcani, ma rocce frantumate e saldate dagli impatti (brecce). Una lezione importante: le foto dall'orbita non bastano, servono campioni sul posto.",
             "Surprise: they were not volcanoes, but rocks shattered and welded together by impacts (breccias). An important lesson: photos from orbit are not enough, you need samples on site."],
    links: [["NASA", "https://www.nasa.gov/mission/apollo-16/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Apollo_16"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Apollo_16"]] },

  { id: "a17", name: "Apollo 17", agency: "NASA", date: "1972-12-11", lat: 20.19, lon: 30.77, place: "Taurus–Littrow", group: "apollo",
    patch: WM("7/76", "Apollo_17-insignia.png"), crew: "Eugene Cernan, Harrison Schmitt, Ronald Evans",
    intro: ["L'ultima missione Apollo e, finora, l'ultima volta di esseri umani sulla Luna. A bordo c'era Harrison Schmitt, l'unico geologo ad aver camminato sulla Luna.",
            "The last Apollo mission and, so far, the last time humans were on the Moon. On board was Harrison Schmitt, the only geologist to have walked on the Moon."],
    why: [["Essendo l'ultima occasione, si scelse il sito più ricco possibile. Taurus–Littrow è una valle stretta tra montagne alte oltre 2 km, ai margini del Mare Serenitatis.",
           "Since it was the last chance, they chose the richest site possible. Taurus–Littrow is a narrow valley between mountains over 2 km high, on the edge of Mare Serenitatis."],
          ["Le montagne (i «massicci») contenevano rocce antiche degli altopiani; il fondo della valle era coperto da un materiale scuro che sembrava cenere vulcanica giovane. Due mondi in pochi chilometri.",
           "The mountains (the “massifs”) held ancient highland rocks; the valley floor was covered by dark material that looked like young volcanic ash. Two worlds within a few kilometres."],
          ["Una frana scesa da una montagna portava rocce dall'alto fino a portata di rover, senza bisogno di scalare.",
           "A landslide down one mountain had brought rocks from high up within rover reach, with no need to climb."]],
    alt: ["Si era valutato anche il cratere Copernico o il lato nascosto, ma erano troppo lontani o troppo rischiosi. Taurus–Littrow dava la massima varietà con un rischio accettabile.",
          "Copernicus crater and the far side were also considered, but they were too far or too risky. Taurus–Littrow offered the most variety at an acceptable risk."],
    legacy: ["Il famoso «suolo arancione», minuscole perle di vetro vulcanico. 110 kg di campioni, il bottino più grande del programma Apollo.",
             "The famous “orange soil”, tiny beads of volcanic glass. 110 kg of samples, the biggest haul of the Apollo program."],
    links: [["NASA", "https://www.nasa.gov/mission/apollo-17/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Apollo_17"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Apollo_17"]] },

  { id: "lp", name: "Lunar Prospector", agency: "NASA", date: "1999-07-31", lat: -87.7, lon: 42.1, place: ["Cratere Shoemaker (Polo Sud)", "Shoemaker crater (South Pole)"], group: "robotic", approx: true,
    patch: WM("0/05", "Lunar_Prospector_insignia.png"),
    intro: ["Una piccola sonda a forma di barile che per 19 mesi ha girato intorno alla Luna passando sopra i poli. Non doveva atterrare: alla fine fu fatta cadere apposta su un cratere del Polo Sud.",
            "A small barrel-shaped probe that circled the Moon for 19 months, passing over the poles. It was not meant to land: at the end it was crashed on purpose into a South Pole crater."],
    why: [["Dall'orbita aveva misurato molto idrogeno vicino ai poli, un indizio di possibile ghiaccio d'acqua nascosto nei crateri dove il Sole non arriva mai.",
           "From orbit it had measured a lot of hydrogen near the poles, a clue to possible water ice hidden in craters the Sun never reaches."],
          ["Il cratere Shoemaker è in ombra permanente: il suo fondo resta sotto i –200 °C. L'idea era che lo schianto sollevasse una nuvola di polvere e vapore da osservare con i telescopi dalla Terra.",
           "Shoemaker crater is permanently shadowed: its floor stays below –200 °C. The idea was that the crash would throw up a cloud of dust and vapour to be watched with telescopes from Earth."],
          ["Il carburante stava finendo: invece di lasciare la sonda cadere a caso, la si usò per un ultimo esperimento.",
           "Fuel was running out: instead of letting the probe fall at random, they used it for one last experiment."]],
    alt: ["Un cratere illuminato non avrebbe insegnato niente sul ghiaccio: alla luce del Sole il ghiaccio evapora in fretta. Solo le «trappole fredde» dei poli possono conservarlo per miliardi di anni.",
          "A sunlit crater would have taught nothing about ice: in sunlight ice evaporates quickly. Only the polar “cold traps” can keep it for billions of years."],
    legacy: ["Dalla Terra non si vide nessuna nuvola, ma le mappe dell'idrogeno ai poli hanno indicato dove cercare l'acqua. È anche l'unica sonda a portare sulla Luna le ceneri di una persona, il geologo Eugene Shoemaker.",
             "No cloud was seen from Earth, but its polar hydrogen maps showed where to look for water. It is also the only probe to carry a person's ashes to the Moon, geologist Eugene Shoemaker's."],
    links: [["NASA", "https://science.nasa.gov/mission/lunar-prospector/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Lunar_Prospector"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Lunar_Prospector"]] },

  { id: "smart1", name: "SMART-1", agency: "ESA", date: "2006-09-03", lat: -34.26, lon: -46.19, place: "Lacus Excellentiae", group: "robotic",
    intro: ["La prima missione europea verso la Luna. Era una sonda piccola ma innovativa: usava un motore a ioni, che spinge pochissimo ma per moltissimo tempo, alimentato dai pannelli solari.",
            "Europe's first mission to the Moon. It was a small but innovative probe: it used an ion engine, which pushes very gently but for a very long time, powered by solar panels."],
    why: [["Come Lunar Prospector, alla fine della missione non doveva atterrare ma cadere. Si scelse di farla cadere sul lato visibile, in una zona che dalla Terra fosse ben osservabile.",
           "Like Lunar Prospector, at the end of the mission it was not meant to land but to crash. The team chose the near side, in an area that could be watched well from Earth."],
          ["Il punto d'impatto era al confine tra luce e ombra, nella notte lunare ma vicino al giorno: un lampo nel buio si vede meglio, e i telescopi a Terra erano pronti.",
           "The impact point was on the border between light and shadow, in lunar night but close to daytime: a flash in the dark is easier to see, and telescopes on Earth were ready."],
          ["Una piana di lava vicino a zone più antiche: la polvere sollevata poteva rivelare di che cosa è fatto il terreno.",
           "A lava plain next to older terrain: the dust thrown up could reveal what the ground is made of."]],
    alt: ["Un impatto sul lato nascosto non sarebbe stato visibile da nessun telescopio. Lasciare la sonda in orbita fino a quando cadesse da sola avrebbe significato un punto e un'ora imprevedibili.",
          "An impact on the far side would not have been visible to any telescope. Leaving the probe in orbit until it fell on its own would have meant an unpredictable place and time."],
    legacy: ["Il lampo dell'impatto fu visto dal telescopio CFHT alle Hawaii. SMART-1 ha dimostrato la propulsione elettrica per lo spazio profondo, poi usata da missioni ESA come BepiColombo verso Mercurio.",
             "The impact flash was seen by the CFHT telescope in Hawaii. SMART-1 proved electric propulsion for deep space, later used by ESA missions such as BepiColombo to Mercury."],
    links: [["ESA", "https://www.esa.int/Science_Exploration/Space_Science/SMART-1"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/SMART-1"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/SMART-1"]] },

  { id: "lcross", name: "LCROSS", agency: "NASA", date: "2009-10-09", lat: -84.68, lon: -48.7, place: ["Cratere Cabeus (Polo Sud)", "Cabeus crater (South Pole)"], group: "robotic", approx: true,
    intro: ["Una missione «a proiettile»: lo stadio vuoto del razzo fu lanciato contro un cratere del Polo Sud, e la sonda LCROSS lo seguì da vicino per studiare la nuvola sollevata, prima di schiantarsi a sua volta.",
            "A “bullet” mission: the empty rocket stage was aimed at a South Pole crater, and the LCROSS probe followed close behind to study the cloud it threw up, before crashing too."],
    why: [["Dopo Lunar Prospector si sospettava ghiaccio ai poli, ma nessuno l'aveva mai «toccato». Serviva un cratere in ombra permanente, cioè una trappola fredda dove il ghiaccio può sopravvivere.",
           "After Lunar Prospector, ice was suspected at the poles, but nobody had ever “touched” it. They needed a permanently shadowed crater, a cold trap where ice can survive."],
          ["Cabeus fu scelto all'ultimo, grazie alle nuove misure della sonda LRO: mostrava il segnale di idrogeno più forte tra i candidati.",
           "Cabeus was picked at the last moment, thanks to new measurements from the LRO probe: it showed the strongest hydrogen signal among the candidates."],
          ["Il bordo del cratere doveva essere abbastanza basso da permettere alla nuvola di uscire alla luce del Sole, dove gli strumenti potevano vederla, e alla Terra di osservarla.",
           "The crater rim had to be low enough for the cloud to rise into sunlight, where the instruments could see it, and for Earth to observe it."]],
    alt: ["Il famoso cratere Shackleton o altri crateri polari avevano bordi più alti o segnali più deboli: la nuvola sarebbe rimasta nascosta nell'ombra.",
          "The famous Shackleton crater and other polar craters had higher rims or weaker signals: the cloud would have stayed hidden in the shadow."],
    legacy: ["La conferma: nella nuvola c'era acqua, circa il 5% del materiale. Per questo il programma Artemis oggi punta al Polo Sud.",
             "The confirmation: the cloud contained water, about 5% of the material. That is why the Artemis program is aiming for the South Pole today."],
    links: [["NASA", "https://science.nasa.gov/mission/lcross/"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/LCROSS"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/LCROSS"]] },

  { id: "art2", name: "Artemis II", agency: "NASA · ESA", date: "2026-04-06", lat: null, lon: 180, place: ["Sorvolo del lato nascosto", "Far-side flyby"], group: "future", flyby: true,
    patch: WM("9/9c", "Artemis_program_(solid_with_wordmark).svg"), patchGeneric: true, crew: "Reid Wiseman, Victor Glover, Christina Koch, Jeremy Hansen",
    intro: ["Il primo volo con astronauti verso la Luna dal 1972. Quattro persone a bordo della capsula Orion hanno girato intorno alla Luna e sono tornate a Terra, dall'1 all'11 aprile 2026. Il modulo di servizio che dava energia e spinta a Orion è stato costruito in Europa dall'ESA.",
            "The first crewed flight to the Moon since 1972. Four people aboard the Orion capsule flew around the Moon and came back to Earth, from 1 to 11 April 2026. The service module that gave Orion power and thrust was built in Europe by ESA."],
    why: [["Artemis II non doveva atterrare: era una prova generale. Prima di portare persone sulla superficie bisognava verificare che Orion, i suoi sistemi di supporto vitale e lo scudo termico funzionassero con un equipaggio vero.",
           "Artemis II was not meant to land: it was a dress rehearsal. Before taking people to the surface, NASA had to check that Orion, its life-support systems and its heat shield worked with a real crew."],
          ["La traiettoria «a ritorno libero» passa dietro il lato nascosto e usa la gravità lunare per tornare verso la Terra senza grandi accensioni del motore: se qualcosa si guasta, la capsula torna comunque a casa.",
           "The “free-return” trajectory swings behind the far side and uses the Moon's gravity to head back to Earth without big engine burns: if something fails, the capsule comes home anyway."],
          ["Il 6 aprile, al punto più vicino, l'equipaggio ha visto con i propri occhi il lato nascosto, che dalla Terra non si vede mai.",
           "On 6 April, at closest approach, the crew saw with their own eyes the far side, which can never be seen from Earth."]],
    alt: ["Entrare in orbita lunare o tentare un atterraggio al primo volo con equipaggio avrebbe aggiunto rischi senza un piano di rientro sicuro. Per questo sul globo non c'è un punto: Artemis II non ha toccato la superficie.",
          "Entering lunar orbit or attempting a landing on the first crewed flight would have added risk without a safe way home. That is why there is no point on the globe: Artemis II never touched the surface."],
    legacy: ["Ha aperto la strada al ritorno sulla Luna. Jeremy Hansen è il primo astronauta non americano a viaggiare verso la Luna e Christina Koch la prima donna.",
             "It paved the way for the return to the Moon. Jeremy Hansen is the first non-American astronaut to travel to the Moon and Christina Koch the first woman."],
    links: [["NASA", "https://www.nasa.gov/mission/artemis-ii/"], ["ESA", "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Orion"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Artemis_II"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Artemis_II"]] },

  { id: "art4", name: "Artemis IV", agency: "NASA · ESA", date: "2028", lat: -86, lon: 10, place: ["Polo Sud (regioni candidate)", "South Pole (candidate regions)"], group: "future", approx: true, planned: true,
    patch: WM("9/9c", "Artemis_program_(solid_with_wordmark).svg"), patchGeneric: true,
    intro: ["Sarà il primo allunaggio con equipaggio del programma Artemis, previsto per il 2028. Quattro astronauti voleranno su Orion fino all'orbita lunare; due scenderanno sulla superficie con un lander commerciale, vicino al Polo Sud, dove nessun essere umano è mai stato.",
            "It will be the first crewed landing of the Artemis program, planned for 2028. Four astronauts will fly Orion to lunar orbit; two will descend to the surface in a commercial lander, near the South Pole, where no human has ever been."],
    why: [["Il motivo principale è l'acqua. Nei crateri in ombra permanente c'è ghiaccio (lo hanno dimostrato Lunar Prospector e LCROSS). Il ghiaccio si può trasformare in acqua da bere, ossigeno da respirare e carburante per i razzi.",
           "The main reason is water. Permanently shadowed craters hold ice (as Lunar Prospector and LCROSS showed). Ice can be turned into drinking water, breathable oxygen and rocket fuel."],
          ["Ai poli il Sole non sorge e tramonta come da noi: gira basso tutto intorno all'orizzonte. Così alcune creste restano illuminate quasi sempre: energia quasi continua per i pannelli solari, a pochi chilometri dal ghiaccio al buio.",
           "At the poles the Sun does not rise and set as it does for us: it circles low around the horizon. So some ridges stay lit almost all the time: nearly continuous power for solar panels, a few kilometres from the dark ice."],
          ["La Terra invece è bassa sull'orizzonte e a volte sparisce dietro le montagne: per questo i siti candidati sono su rilievi da cui la Terra si vede per più tempo possibile.",
           "Earth, on the other hand, sits low on the horizon and sometimes disappears behind mountains: that is why the candidate sites are on high ground with Earth in view for as long as possible."],
          ["La NASA ha individuato diverse regioni candidate, tra cui Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton, Nobile Rim, de Gerlache Rim 2 e Slater Plain. La scelta finale dipende dalla data di lancio, perché luce e Terra cambiano nel tempo.",
           "NASA has identified several candidate regions, including Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton, Nobile Rim, de Gerlache Rim 2 and Slater Plain. The final choice depends on the launch date, because light and Earth change over time."]],
    alt: ["L'equatore, dove sono atterrati gli Apollo, è più facile da raggiungere ma ha notti di due settimane e niente ghiaccio a portata di mano. Per una presenza lunga e sostenibile serve il Polo Sud. È esattamente il problema che la versione esperta di questa app aiuta a risolvere.",
          "The equator, where Apollo landed, is easier to reach but has two-week nights and no ice within reach. A long, sustainable presence needs the South Pole. It is exactly the problem the expert edition of this app helps solve."],
    legacy: ["Missione futura. A febbraio 2026 la NASA ha trasformato Artemis III in un test in orbita terrestre (previsto per il 2027) e ha spostato il primo allunaggio ad Artemis IV, nel 2028. L'ESA contribuisce con il modulo di servizio di Orion e con moduli per la futura stazione lunare.",
             "Future mission. In February 2026 NASA turned Artemis III into an Earth-orbit test (planned for 2027) and moved the first landing to Artemis IV, in 2028. ESA contributes Orion's service module and modules for the future lunar station."],
    links: [["NASA", "https://www.nasa.gov/humans-in-space/artemis/"], ["ESA", "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/Artemis"], ["Wikipedia IT", "https://it.wikipedia.org/wiki/Programma_Artemis"], ["Wikipedia EN", "https://en.wikipedia.org/wiki/Artemis_IV"]] },
];
const HCOL = { apollo: "#fbbf24", robotic: "#7fd3ff", future: "#4ade80" };
const HG = { lat: 10, lon: 10, zoom: 1, sel: "a11", filter: "all", maxWidthFrac: .58, real: true };
const hPlace = h => Array.isArray(h.place) ? tL(h.place[0], h.place[1]) : h.place;
const hCanvas = document.getElementById("hGlobe");
HG.glCanvas = document.getElementById("hGlobeGL");
function hMarkers() {
  HG.markers = HIST.filter(h => (HG.filter === "all" || h.group === HG.filter) && h.lat != null)
    .map(h => ({ lat: h.lat, lon: h.lon, color: HCOL[h.group], sel: h.id === HG.sel, label: h.id === HG.sel ? h.name : null }));
}
function hFit() {                          // il globo occupa solo lo spazio a sinistra della scheda
  const w = hCanvas.parentElement, det = document.getElementById("hDetail");
  if (w.clientWidth) HG.maxWidthFrac = Math.max(.3, (w.clientWidth - det.offsetWidth - 56) / w.clientWidth);
}
const hRender = rafOnce(() => { hMarkers(); hFit(); drawSphere(hCanvas, HG); });
HG.redraw = hRender;
sphereControls(hCanvas, HG, hRender, ll => {
  let best = null, bd = 8;                // clic vicino a un sito → lo seleziona
  for (const h of HIST) { if (h.lat == null) continue; const d = angDeg(unit(ll[0], ll[1]), unit(h.lat, h.lon)); if (d < bd) { bd = d; best = h; } }
  if (best) selectHistory(best.id);
});
function renderHistoryList() {
  const ol = document.getElementById("hList");
  ol.innerHTML = HIST.filter(h => HG.filter === "all" || h.group === HG.filter).map(h => `
    <li><button data-h="${h.id}" class="${h.id === HG.sel ? "sel" : ""}"><span class="dot" style="background:${HCOL[h.group]}"></span>
      <span class="nm">${esc(h.name)}</span><span class="yr">${esc(h.date.slice(0, 4))}</span>
      <span class="pl">${esc(hPlace(h))} · ${esc(h.agency)}</span></button></li>`).join("");
}
function hBadge(h) {
  const c = HCOL[h.group], words = h.name.split(/\s+/);
  return `<svg viewBox="0 0 120 120" class="h-badge" role="img" aria-label="${esc(h.name)}">
    <defs><radialGradient id="hbg_${h.id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#2a3550"/><stop offset="1" stop-color="#0b0f1a"/></radialGradient></defs>
    <circle cx="60" cy="60" r="56" fill="url(#hbg_${h.id})" stroke="${c}" stroke-width="5"/>
    <circle cx="60" cy="60" r="47" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width="1.5"/>
    <circle cx="60" cy="27" r="10" fill="#d9d4c7"/><circle cx="57" cy="25" r="2.2" fill="#b9b3a5"/><circle cx="63.5" cy="30" r="1.6" fill="#b9b3a5"/>
    ${words.map((w, i) => `<text x="60" y="${68 + (i - (words.length - 1) / 2) * 17}" text-anchor="middle" fill="#fff" font-family="Orbitron, sans-serif" font-weight="800" font-size="${w.length > 7 ? 13 : 16}">${esc(w)}</text>`).join("")}
    <text x="60" y="103" text-anchor="middle" fill="${c}" font-family="Inter, sans-serif" font-weight="700" font-size="10" letter-spacing="2">${esc(h.agency.replace(/ · /g, "/"))}</text>
  </svg>`;
}
function renderHistoryDetail() {
  const h = HIST.find(x => x.id === HG.sel); if (!h) return;
  const dt = h.date.length > 4 ? new Date(h.date + "T12:00:00Z").toLocaleDateString(lang, { dateStyle: "long" }) : h.date;
  const pos = h.lat == null ? t("hFlyby") : `${h.approx ? "≈ " : ""}${fmtLL(h.lat, h.lon)}${h.approx ? ` (${t("hApprox")})` : ""}`;
  const el = document.getElementById("hDetail");
  el.innerHTML = `
    <div class="h-head">
      <div class="h-patch">${h.patch ? `<img src="${h.patch}" alt="${esc(t("hPatchAlt", { n: h.name }))}" referrerpolicy="no-referrer" loading="lazy">` : hBadge(h)}</div>
      <div><span class="tag" style="color:${HCOL[h.group]}">${t(h.group === "apollo" ? "hApollo" : h.group === "future" ? "hFuture" : "hRobotic")}${h.planned ? " · " + t("hPlanned") : ""}</span>
      <h4>${esc(h.name)}</h4>
      <div class="meta">${esc(h.agency)} · ${esc(dt)}<br>${esc(hPlace(h))} · ${pos}${h.crew ? `<br>${t("hCrew")}: ${esc(h.crew)}` : ""}</div></div>
    </div>
    ${h.patch ? `<p class="h-pcap">${t(h.patchGeneric ? "hPatchGen" : "hPatchCap")}</p>` : `<p class="h-pcap">${t("hPatchNone")}</p>`}
    <h5>${t("hWhat")}</h5><p>${esc(tL(h.intro[0], h.intro[1]))}</p>
    <h5>${t("hWhy")}</h5><ul>${h.why.map(w => `<li>${esc(tL(w[0], w[1]))}</li>`).join("")}</ul>
    <div class="h-alt"><h5>${t("hAlt")}</h5><p>${esc(tL(h.alt[0], h.alt[1]))}</p></div>
    <h5>${t("hLegacy")}</h5><p>${esc(tL(h.legacy[0], h.legacy[1]))}</p>
    <h5>${t("hLinks")}</h5><div class="h-links">${h.links.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(l)} ↗</a>`).join("")}</div>
    <p class="src">${t("hSrc")}</p>`;
  const im = el.querySelector(".h-patch img");
  if (im) im.addEventListener("error", () => { im.parentElement.innerHTML = hBadge(h); el.querySelector(".h-pcap").textContent = t("hPatchOff"); }, { once: true });
  el.scrollTop = 0;
}
let hAnim = 0;
function selectHistory(id) {
  HG.sel = id; renderHistoryList(); renderHistoryDetail(); hMarkers();
  const h = HIST.find(x => x.id === id), from = { lat: HG.lat, lon: HG.lon }, to = { lat: h.lat == null ? 0 : Math.max(-75, Math.min(75, h.lat)), lon: h.lon };
  const dl = wrap180(to.lon - from.lon), t0 = performance.now(); cancelAnimationFrame(hAnim);
  const step = now => {
    const k = Math.min(1, (now - t0) / 700), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    HG.lat = from.lat + (to.lat - from.lat) * e; HG.lon = wrap180(from.lon + dl * e); HG.low = k < 1;
    hFit(); drawSphere(hCanvas, HG);
    if (k < 1) hAnim = requestAnimationFrame(step); else hRender();
  };
  hAnim = requestAnimationFrame(step);
}
document.getElementById("hList").addEventListener("click", e => { const b = e.target.closest("[data-h]"); if (b) selectHistory(b.dataset.h); });
(function () {
  const pane = document.getElementById("pane-history"), box = document.getElementById("hFont");
  let z = "1.2"; try { z = localStorage.getItem("mlsn_hz") || z; } catch (e) {}
  const apply = v => { pane.style.setProperty("--hz", v); box.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.z === v)); };
  apply(z);
  box.addEventListener("click", e => { const b = e.target.closest("[data-z]"); if (!b) return; apply(b.dataset.z); hRender(); try { localStorage.setItem("mlsn_hz", b.dataset.z); } catch (e) {} });
})();
document.getElementById("hFilter").addEventListener("click", e => {
  const b = e.target.closest("[data-f]"); if (!b) return;
  HG.filter = b.dataset.f;
  document.querySelectorAll("#hFilter button").forEach(x => x.classList.toggle("active", x === b));
  const vis = HIST.filter(h => HG.filter === "all" || h.group === HG.filter);
  if (!vis.some(h => h.id === HG.sel) && vis[0]) selectHistory(vis[0].id); else { renderHistoryList(); hRender(); }
});

/* Terra con la sua fase (usata nell'allunaggio) */


/* ---------- start ---------- */
const zHist = (f, live) => { HG.zoom = Math.max(.8, Math.min(4, (HG.zoom || 1) * f)); hRender(); };
zoomCtl("hWrap", zHist); pinch(hCanvas, zHist);
mChip("hDetail", "chipCard", true);
onLang(() => { renderHistoryList(); renderHistoryDetail(); hRender(); });
eduOnResize(hRender);
landBoot();
