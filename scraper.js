const fs = require('fs');

const url = 'https://cdn.holavonat.is/emig_data_v1.json';
const dataFile = 'data.json';

// Rekurzív függvény a UIC számok kinyerésére (ugyanaz a logika, mint eddig)
function extractUicNumbers(obj, uicSet) {
    if (Array.isArray(obj)) {
        obj.forEach(item => extractUicNumbers(item, uicSet));
    } else if (typeof obj === 'object' && obj !== null) {
        for (let key in obj) {
            if (key === 'uic' && typeof obj[key] === 'string') {
                uicSet.add(obj[key].trim());
            } else {
                extractUicNumbers(obj[key], uicSet);
            }
        }
    }
}

async function run() {
    try {
        console.log('Adatok lekérése a hálózatról...');
        // Letöltjük az aktuális adatokat (cache-busting paraméterrel)
        const response = await fetch(`${url}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP hiba: ${response.status}`);
        const liveData = await response.json();

        let currentUics = new Set();
        extractUicNumbers(liveData, currentUics);

        // Beolvassuk az eddig mentett adatokat a data.json-ből
        let savedUics = new Set();
        if (fs.existsSync(dataFile)) {
            const fileContent = fs.readFileSync(dataFile, 'utf8');
            if (fileContent) {
                const parsed = JSON.parse(fileContent);
                parsed.forEach(uic => savedUics.add(uic));
            }
        }

        // Összehasonlítás és bővítés
        let newCount = 0;
        currentUics.forEach(uic => {
            if (!savedUics.has(uic)) {
                savedUics.add(uic);
                newCount++;
            }
        });

        // Ha van új adat, felülírjuk a data.json fájlt
        if (newCount > 0) {
            const sortedUics = Array.from(savedUics).sort();
            fs.writeFileSync(dataFile, JSON.stringify(sortedUics, null, 2));
            console.log(`Siker! ${newCount} ÚJ UIC szám hozzáadva az adatbázishoz. Összesen: ${sortedUics.length} db.`);
        } else {
            console.log('Nincs új UIC szám. Nem történt módosítás.');
        }
    } catch (error) {
        console.error('Hiba történt a futás során:', error);
        process.exit(1); // Hibás kilépés, így a GitHub jelzi, ha gond van
    }
}

run();