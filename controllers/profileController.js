const profileModel = require("../models/profileModel");

// GET /api/profile
async function getProfile(req, res) {
    try {
        const userId = req.user.id;

        const profile = await profileModel.getProfileById(userId);

        res.json({ profile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

// PATCH /api/profile
async function updateProfile(req, res) {
    try {
        const userId = req.user.id;

        const updates = {
            full_name: req.body.full_name,
            phone: req.body.phone,
            address_line1: req.body.address_line1,
            address_line2: req.body.address_line2,
            city: req.body.city,
            state: req.body.state,
            postal_code: req.body.postal_code,
            country: req.body.country,
        };
        // Validate phone number
        if (
            updates.phone &&
            !/^[0-9]{10}$/.test(updates.phone)
        ) {
            return res.status(400).json({
                error: "Phone number must contain exactly 10 digits."
            });
        }

        // Validate postal code 
        if (
            updates.postal_code &&
            !/^[0-9]{6}$/.test(updates.postal_code)
        ) {
            return res.status(400).json({
                error: "Postal code must contain exactly 6 digits."
            });
        }

        // Remove undefined values
        Object.keys(updates).forEach((key) => {
            if (updates[key] === undefined) {
                delete updates[key];
            }
        });

        const profile = await profileModel.updateProfile(userId, updates);

        res.json({
            message: "Profile updated successfully.",
            profile,
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
}

module.exports = {
    getProfile,
    updateProfile,
};