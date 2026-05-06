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

const API_URL = "https://abc.predikapp.com/api/front/event/crypto-detail/EV1777919400710557F14";
// const API_URL = "https://abc.predikapp.com/api/front/event/sports-detail/EV1774560608740B5702C";

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

const checkBtcEvent = async () => {
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

        const events = response?.data?.data?.guesses || [];
        const newTrades = events.filter((trade) =>
            // trade.title.includes("runs or more at the end of")
            trade.title.includes("BTC/USD Up or Down")
        );
        // console.log(newTrades);

        // const currentEventNos = events.map((e) => e.guessNo);
        const currentEventNos = newTrades.map((e) => e.guessNo);

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
                console.log(eventNo);
                await purchaseShares(eventNo, 1, 5);
                await purchaseShares(eventNo, 2, 5);
                // await purchaseShares(eventNo, 1, 1.5);
                // await purchaseShares(eventNo, 2, 1.5);
            }
        }
    } catch (error) {
        console.error("Task error:", error.message);
    }
};

const purchaseShares = async (guessNo, guessType, pr) => {
    try {
        const tradeInfo = await getTradeInfo();

        if (!tradeInfo) {
            console.error("[Purchase] Could not fetch tradeInfo from Firebase.");
            return null;
        }

        const response = await axios.post(
            "https://abc.predikapp.com/api/front/guest/user/purchase-shares",
            {
                channel: "h5",
                channelId: "yes_no",
                // deviceCode: "a2c90ecf-6908-f1fc-5d6d-21f6d2414dff",
                deviceCode: "bf3626a4-6360-beec-686e-7f748cd2d4ac",
                guessNo: guessNo,
                type: guessType,
                price: pr,
                quantity: 10,
                slQuantity: 10,
                slTriggerPrice: 1.5,
                tradeType: 1,
                versionCode: 999,
            },
            {
                headers: {
                    ...HEADERS,
                    token: process.env.API_KEY,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
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

const sellOrder = async (guessNo, price, quantity, type) => {
    try {
        console.log(guessNo, price, quantity, type);

        const response = await axios.post(
            "https://abc.predikapp.com/api/front/guest/user/sell-shares",
            {
                channel: "h5",
                channelId: "yes_no",
                deviceCode: "bf3626a4-6360-beec-686e-7f748cd2d4ac",
                guessNo: guessNo,
                price: price,
                quantity: quantity,
                type: type,
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
            console.log("Retry Selling");
            console.log(response.data);

            // await sellOrder(guessNo, price, quantity, type);
        }
        else {
            console.log(`[Sell] Response for guessNo ${guessNo}:`, response?.data);
        }
        return response?.data || null;
    } catch (err) {
        console.error(`[Sell] Error for guessNo ${guessNo}:`, err.message);
        return null;
    }
};

const startSelling = async () => {
    try {
        const response = await axios.post(
            "https://abc.predikapp.com/api/front/guest/user/user-positions",
            {
                channel: "h5",
                channelId: "yes_no",
                deviceCode: "bf3626a4-6360-beec-686e-7f748cd2d4ac",
                pageNum: 1,
                pageSize: 20,
                userId: 754910,
                // userId: 330790,
                versionCode: 999,
            },
            {
                headers: {
                    ...HEADERS,
                    token: process.env.API_KEY,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            }
        );

        const positionList = response?.data?.data?.positionList || [];
        // console.log("[Selling] positionList:", positionList);

        if (positionList.length > 0) {
            // const matchedTrades = positionList.filter((trade) =>
            //     trade.eventTitle.includes("BTC/USD Up or Down")
            // );

            for (const trade of positionList) {
                console.log(trade);
                await sellOrder(trade.guessNo, +trade.averagePrice + 0.5, +trade.quantity, +trade.guessType);
            }
        } else {
            console.log("No Matched Trade Found");
        }
        return null;
    } catch (err) {
        console.error("[Selling] Error:", err.message);
        return null;
    }
};

module.exports = { checkBtcEvent, startSelling };