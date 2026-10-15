const fs = require('fs');

const url = 'https://cdn.holavonat.is/emig_data_v1.json';
const dataFile = 'data.json';
const logFile = 'last_new.json'; // Az új "cetli" fájl

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
        const response = await fetch(`${url}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP hiba: ${response.status}`);
        const liveData = await response.json();

        let currentUics = new Set();
        extractUicNumbers(liveData, currentUics);

        let savedUics = new Set();
        if (fs.existsSync(dataFile)) {
            const fileContent = fs.readFileSync(dataFile, 'utf8');
            if (fileContent) {
                const parsed = JSON.parse(fileContent);
                parsed.forEach(uic => savedUics.add(uic));
            }
        }

        let newUics = [];
        currentUics.forEach(uic => {
            if (!savedUics.has(uic)) {
                savedUics.add(uic);
                newUics.push(uic);
            }
        });

        // Ha van új adat, elmentjük azokat
        if (newUics.length > 0) {
            const sortedUics = Array.from(savedUics).sort();
            fs.writeFileSync(dataFile, JSON.stringify(sortedUics, null, 2));
            
            // Létrehozzuk a weboldalnak szóló naplót
            const logData = {
                timestamp: new Date().toISOString(),
                newUics: newUics
            };
            fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));

            console.log(`Siker! ${newUics.length} ÚJ UIC szám hozzáadva az adatbázishoz.`);
        } else {
            console.log('Nincs új UIC szám. Nem történt módosítás.');
        }
    } catch (error) {
        console.error('Hiba történt a futás során:', error);
        process.exit(1);
    }
}

run();
