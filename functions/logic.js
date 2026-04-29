const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const HEADERS = {
    "sec-ch-ua-platform": "Windows",
    "Referer": "https://beta.predikapp.com/",
    "packageId": "10001",
    "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    "sec-ch-ua-mobile": "?0",
    "x-origin": "h5",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
};

const FILE_PATH = path.join(__dirname, "events.json");

const API_URL =
    "https://api.predikapp.com/api/front/event/sports/upcoming?topicId=586&pageNum=1&pageSize=20&timeRange=upcoming";

const getStoredEvents = () => {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            return [];
        }
        const data = fs.readFileSync(FILE_PATH, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading file:", err.message);
        return [];
    }
};

const saveEvents = (eventNos) => {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(eventNos, null, 2));
    } catch (err) {
        console.error("Error writing file:", err.message);
    }
};

const checkNewEvent = async () => {
    try {
        console.log("Task running at:", new Date().toISOString());

        const response = await axios.get(API_URL, {
            headers: {
                "sec-ch-ua-platform": "Windows",
                Referer: "https://beta.predikapp.com/",
                packageId: "10001",
                "sec-ch-ua":
                    '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
                "sec-ch-ua-mobile": "?0",
                "x-origin": "h5",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
                Accept: "application/json, text/plain, */*",
                token: process.env.API_KEY,
            },
        });

        const events = response?.data?.data || [];
        // console.log(events);

        const currentEventNos = events.map((e) => e.eventNo);

        const storedEventNos = getStoredEvents();

        // Find new events
        const newEvents = currentEventNos.filter(
            (eventNo) => !storedEventNos.includes(eventNo)
        );

        if (storedEventNos.length === 0) {
            console.log("Initial load: storing all events...");
            saveEvents(currentEventNos);
            return;
        }

        if (newEvents.length > 0) {
            console.log("[Task] New events found 🚀:", newEvents);
            const updatedEvents = [...new Set([...storedEventNos, ...newEvents])];
            saveEvents(updatedEvents);
            // Call detail API for each new event
            for (const eventNo of newEvents) {
                await getEventDetail(eventNo);
            }

            // const updatedEvents = [...new Set([...storedEventNos, ...newEvents])];
            // saveEvents(updatedEvents);
        }
    } catch (error) {
        console.error("Task error:", error.message);
    }
};

const getEventDetail = async (eventNo) => {
    try {
        const response = await axios.get(
            `https://api.predikapp.com/api/front/event/sports-detail/${eventNo}`,
            {
                headers: {
                    ...HEADERS,
                    token: process.env.API_KEY,
                },
                timeout: 10000,
            }
        );

        const guesses = response?.data?.data?.guesses || [];

        const winGuess = guesses.find((g) =>
            g.title.toLowerCase().includes("toss winner will bat or bowl")
        );

        if (winGuess) {
            console.log(`[Event Detail] guessNo for "${winGuess.title}":`, winGuess.guessNo);
            await purchaseShares(winGuess.guessNo, 1);
            // await purchaseShares(winGuess.guessNo, 2);
        } else {
            console.log(`[Event Detail] No "toss winner will bat or bowl" guess found for ${eventNo}`);
            await getEventDetail(eventNo);
        }

        return response?.data || null;
    } catch (err) {
        console.error(`[Event Detail] Error fetching detail for ${eventNo}:`, err.message);
        await getEventDetail(eventNo);
        return null;
    }
};

const purchaseShares = async (guessNo, guessType) => {
    try {
        const tradeInfo = await getTradeInfo();

        if (!tradeInfo) {
            console.error("[Purchase] Could not fetch tradeInfo from Firebase.");
            return null;
        }

        const response = await axios.post(
            "https://api.predikapp.com/api/front/guest/user/purchase-shares",
            {
                channel: "h5",
                channelId: "yes_no",
                deviceCode: "bf3626a4-6360-beec-686e-7f748cd2d4ac",
                guessNo: guessNo,
                type: guessType,
                // price: tradeInfo.price,
                // quantity: tradeInfo.quantity,
                price: 1,
                quantity: 150,
                tradeType: 1,
                versionCode: 999,
            },
            {
                headers: {
                    ...HEADERS,
                    token: process.env.API_KEY,
                    "Content-Type": "application/json",
                },
                timeout: 8000,
            }
        );

        if (response?.data?.msg !== 'ok') {
            await purchaseShares(guessNo, guessType);
            console.log("Retry Purchase");
        }
        else {
            console.log(`[Purchase] Success for guessNo ${guessNo}:`, response?.data);
            return response?.data || null;
        }
    } catch (err) {
        console.error(`[Purchase] Error for guessNo ${guessNo}:`, err.message);
        return null;
    }
};

const getTradeInfo = async () => {
    try {
        const response = await axios.get(
            "https://cricketauto-default-rtdb.europe-west1.firebasedatabase.app/tradeInfo.json"
        );
        console.log("[Firebase] tradeInfo:", response?.data);
        return response?.data || null;
    } catch (err) {
        console.error("[Firebase] Error fetching tradeInfo:", err.message);
        return null;
    }
};

module.exports = { checkNewEvent };