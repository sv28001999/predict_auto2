const axios = require('axios');
const { checkNewEvent } = require('../functions/logic');
const { checkBtcEvent, startSelling } = require('../functions/btcLogic');
const fs = require("fs");
const path = require("path");
const FILE_PATH = path.join(__dirname, "../functions/events.json"); // adjust path if needed
const activeIntervals = new Map();

const getServerTime = async (req, res, next) => {
    try {
        const response = {
            data: "01/01/2026"
        }

        console.log(response);

        return res.status(200).json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching time:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch server time',
            error: error.message
        });
    }
};

const startAuto = async (req, res, next) => {
    try {
        const intervalMs = 2000;

        if (activeIntervals.has("default")) {
            return res.status(409).json({
                success: false,
                message: "Task is already running. Stop it first before starting again.",
            });
        }

        // 🔥 Delete file BEFORE starting interval
        if (fs.existsSync(FILE_PATH)) {
            fs.unlinkSync(FILE_PATH);
            console.log("events.json deleted before starting task");
        }

        const id = setInterval(async () => {
            try {
                await checkNewEvent();
                // await checkBtcEvent();
            } catch (err) {
                console.error("Error in checkNewEvent:", err.message);
            }
        }, intervalMs);

        activeIntervals.set("default", id);

        return res.status(200).json({
            success: true,
            message: "Task started successfully",
            data: {
                intervalMs,
                startedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("Error starting task:", error.message);
        next(error);
    }
};

const startSellAuto = async (req, res, next) => {
    try {
        const intervalMs = 2000;

        if (activeIntervals.has("defaultSell")) {
            return res.status(409).json({
                success: false,
                message: "Task is already running. Stop it first before starting again.",
            });
        }

        // 🔥 Delete file BEFORE starting interval
        // if (fs.existsSync(FILE_PATH)) {
        //     fs.unlinkSync(FILE_PATH);
        //     console.log("events.json deleted before starting task");
        // }

        const id = setInterval(async () => {
            try {
                // await checkNewEvent();
                await startSelling();
                // await checkBtcEvent();
            } catch (err) {
                console.error("Error in checkNewEvent:", err.message);
            }
        }, intervalMs);

        activeIntervals.set("defaultSell", id);

        return res.status(200).json({
            success: true,
            message: "Task started successfully",
            data: {
                intervalMs,
                startedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("Error starting task:", error.message);
        next(error);
    }
};

const stopAuto = async (req, res, next) => {
    try {
        const intervalId = activeIntervals.get("default");

        if (!intervalId) {
            return res.status(404).json({
                success: false,
                message: "No active task found.",
            });
        }

        clearInterval(intervalId);
        activeIntervals.delete("default");

        return res.status(200).json({
            success: true,
            message: "Task stopped successfully",
            stoppedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error stopping task:", error.message);
        next(error);
    }
};

const stopSellAuto = async (req, res, next) => {
    try {
        const intervalId = activeIntervals.get("defaultSell");

        if (!intervalId) {
            return res.status(404).json({
                success: false,
                message: "No active task found.",
            });
        }

        clearInterval(intervalId);
        activeIntervals.delete("defaultSell");

        return res.status(200).json({
            success: true,
            message: "Task stopped successfully",
            stoppedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error stopping task:", error.message);
        next(error);
    }
};

const getAutoStatus = async (req, res, next) => {
    try {
        const isRunning = activeIntervals.has("default");

        return res.status(200).json({
            success: true,
            data: {
                isRunning,
                message: isRunning ? "Task is currently running" : "Task is not running",
                checkedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("Error fetching status:", error.message);
        next(error);
    }
};

module.exports = {
    getServerTime,
    startAuto,
    stopAuto,
    getAutoStatus,
    startSellAuto,
    stopSellAuto
}