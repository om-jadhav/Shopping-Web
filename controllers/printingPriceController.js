const printingPriceModel = require("../models/printingPriceModel");

async function getPrices(req, res) {
  try {
    const prices = await printingPriceModel.getPrices();
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updatePrices(req, res) {
  try {
    const { singleSidePrice, doubleSidePrice } = req.body;

    const data = await printingPriceModel.updatePrices(
      Number(singleSidePrice),
      Number(doubleSidePrice)
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getPrices,
  updatePrices,
};