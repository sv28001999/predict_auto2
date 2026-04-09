const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { getServerTime, startAuto, stopAuto, getAutoStatus, startSellAuto, stopSellAuto } = require('../controllers/allApis');

router.route('/getServerTime').get(getServerTime);
router.route('/startAuto').get(startAuto);
router.route('/stopAuto').get(stopAuto);
router.route('/getAutoStatus').get(getAutoStatus);
router.route('/startSellAuto').get(startSellAuto);
router.route('/stopSellAuto').get(stopSellAuto);

router.route('/events').get((req, res) => {
    const filePath = path.join(__dirname, '../functions/events.json');
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'No events file found.' });
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return res.status(200).json({ success: true, data: JSON.parse(data) });
});

module.exports = router;