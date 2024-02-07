const router = require("express").Router();
const UserModel = require("../models/User");
const nodemailer = require('nodemailer');
const dotenv = require("dotenv");
const axios = require("axios")

dotenv.config();




router.post('/api/users/:phone', async (req, res) => {
    const { phone } = req.params;
    const { firstName, lastName, email, addPhone, address, zipCode, city } = req.body;

    try {
        // Find the user by email
        const existingUser = await UserModel.findOne({ phone });

        if (existingUser) {
            // Update the existing user's information
            existingUser.firstName = firstName;
            existingUser.lastName = lastName;
            existingUser.email = email;
            existingUser.addPhone = addPhone || '';
            existingUser.address = address;
            existingUser.zipCode = zipCode;
            existingUser.city = city;

            await existingUser.save();
            res.status(200).json({ message: 'User information updated successfully.' });
        } else {
            // Create a new user if not exists
            const newUser = new UserModel({
                email,
                firstName,
                lastName,
                phone,
                addPhone: addPhone || '',
                address,
                zipCode,
                city,
            });

            await newUser.save();
            res.status(201).json({ message: 'User created successfully.' });
        }
    } catch (error) {
        console.error('Error storing user information:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/api/users-fill/:email', async (req, res) => {
    const { email } = req.params;
    const { firstName, lastName, phone, addPhone, address, zipCode, city } = req.body;

    try {
        // Find the user by email
        const existingUser = await UserModel.findOne({ email });

        if (existingUser) {
            // Update the existing user's information
            existingUser.firstName = firstName;
            existingUser.lastName = lastName;
            existingUser.phone = phone;
            existingUser.addPhone = addPhone || '';


            await existingUser.save();
            res.status(200).json({ message: 'User information updated successfully.' });
        } else {
            // Create a new user if not exists
            const newUser = new UserModel({
                email,
                firstName,
                lastName,
                phone,
                addPhone: addPhone || '',

            });

            await newUser.save();
            res.status(201).json({ message: 'User created successfully.' });
        }
    } catch (error) {
        console.error('Error storing user information:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/api/users/:phone', async (req, res) => {
    const { phone } = req.params;

    try {
        // Find the user by email
        const user = await UserModel.findOne({ phone });

        if (user) {
            const userData = {
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                addPhone: user.addPhone,
                address: user.address,
                zipCode: user.zipCode,
                city: user.city,
                email: user.email
            };

            res.status(200).json(userData);
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        console.error('Error fetching user information:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.get('/get-all-users', async (req, res) => {
    try {
        const { page = 1, pageSize = 5, search = '' } = req.query;
        const skip = (page - 1) * pageSize;

        const query = {};

        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { zipCode: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }

        const allUsers = await UserModel.find(query)
            .select('email firstName lastName phone addPhone address zipCode city')
            .sort({ createdAt: -1 }) // Assuming you have a createdAt field in your UserSchema
            .skip(skip)
            .limit(parseInt(pageSize));

        const totalUsers = await UserModel.countDocuments(query);

        res.json({
            totalRows: totalUsers,
            data: allUsers,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.get('/get-all-userss', async (req, res) => {
    try {
        const { page = 1, pageSize = 10, search = '' } = req.query;
        const skip = (page - 1) * pageSize;

        const query = {};

        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { zipCode: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }

        const allUsers = await UserModel.find(query)
            .select('email firstName lastName phone addPhone address zipCode city')
            .sort({ createdAt: -1 }) // Assuming you have a createdAt field in your UserSchema
            .skip(skip)
            .limit(parseInt(pageSize));

        const totalUsers = await UserModel.countDocuments(query);
        const headers = ["email", "firstName", "lastName", "phone", "addPhone", "address", "zipCode", "city"];

        res.send({
            headers,
            totalRows: totalUsers,
            data: allUsers,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.delete('/delete/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Check if the user exists
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete the user
        await UserModel.findByIdAndDelete(userId);

        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/api/users/:phone/city', async (req, res) => {
    try {
        const phone = req.params.phone;
        const newCity = req.body.city;

        // Find the user by ID
        const user = await UserModel.findOne({ phone });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update the city field
        user.city = newCity;

        // Save the updated user
        await user.save();

        res.json({ message: 'City updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/api/users/:phone/city', async (req, res) => {
    try {
        const phone = req.params.phone;

        // Find the user by ID and select only the city field
        const user = await UserModel.findOne({ phone }).select('city');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ city: user.city });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/api/user/promo-status/:email', async (req, res) => {
    try {
        const { email } = req.params;

        // Find the user by email
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Respond with the promoStatus
        res.json({ promoStatus: user.promoStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

const sendSMS = async (mobileNumber) => {
    try {
        const otp = Math.floor(1000 + Math.random() * 9000);
        const otpExpiry = Date.now() + 600000;
        const apiUrl = 'https://control.msg91.com/api/v5/flow/';
        const headers = {
            "authkey": "413319Apv4eIy5qvDs659e4869P1"
        }
        const response = await axios.post(apiUrl,
            {
                "template_id": "659cb356d6fc05410c2c0a62",
                "short_url": "0",
                "recipients": [
                    {
                        "mobiles": mobileNumber,
                        "var": otp
                    }
                ]
            }
            , { headers })


        return { otp, otpExpiry };
    } catch (error) {
        console.error(error);
        throw error;
    }
};

router.post('/send-sms', async (req, res) => {
    const { mobileNumber } = req.body;
    const formattedMobileNumber = `91${mobileNumber}`;
    try {
        const { otp, otpExpiry } = await sendSMS(formattedMobileNumber);
        let user = await UserModel.findOne({ phone: mobileNumber });
        if (!user) {
            user = new UserModel({ phone: mobileNumber })
        }
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();
        res.json({ message: "OTP Sent Successfully" });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/sms-login', async (req, res) => {
    const { otp, phone } = req.body;

    // Find user by reset token, OTP, and email
    const user = await UserModel.findOne({
        phone,
        otp,
        otpExpiry: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid OTP or Phone' });
    }

    // Clear OTP and OTP expiry after successful reset
    user.otp = undefined;
    user.otpExpiry = undefined;

    try {
        await user.save();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server Error' });
    }

    res.json({ user });
});



module.exports = router;