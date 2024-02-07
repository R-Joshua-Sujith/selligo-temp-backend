const router = require("express").Router();
const express = require("express");
const ProductModel = require("../models/Product");
const CategoryModel = require("../models/Category");
const multer = require('multer');
const XLSX = require('xlsx');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Set the destination folder
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use the original filename
    }
});

const upload2 = multer({ storage: storage2 });

router.post('/create-products', upload2.single('productImage'), async (req, res) => {
    try {
        const { basePrice, variant, brandName, seriesName, categoryType, model, dynamicFields, bestSelling } = req.body;
        const dynamicFieldsArray = JSON.parse(dynamicFields);
        const productImage = req.file.originalname;
        const newProduct = new ProductModel({ productImage, basePrice, variant, brandName, seriesName, categoryType, model, dynamicFields: dynamicFieldsArray, bestSelling });
        const savedProduct = await newProduct.save();
        res.json(savedProduct);
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.productName) {
            res.status(400).json({ error: 'Product already exists' })
        } else {
            res.status(500).json({ error: "Internal Server error" })
            console.log(error)
        }
    }
});

// Assuming you have your ProductModel and app.post('/create-products') code above

// Add a new route to get products based on categoryType and brandName
router.get('/get-products/:categoryType/:brandName', async (req, res) => {
    try {
        const { categoryType, brandName } = req.params;

        if (!categoryType || !brandName) {
            return res.status(400).json({ error: 'Both categoryType and brandName are required parameters' });
        }

        const products = await ProductModel.find({ categoryType, brandName });
        // const category = await CategoryModel.find({ category_type: categoryType })
        // const data = [];
        // console.log(category)
        // if (category[0].attributes) {
        //     category[0].attributes.forEach(attribute => {
        //         attribute.options.forEach(option => {
        //             data.push({
        //                 optionHeading: option.optionHeading,
        //                 optionType: option.optionType,
        //             })
        //         })
        //     })
        // }
        // if (category[0].sections) {
        //     category[0].sections.forEach(section => {

        //         section.options.forEach(option => {
        //             data.push({
        //                 optionHeading: option.optionHeading,
        //                 optionType: option.optionType,
        //             });
        //         });
        //     });
        // }


        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server error' });
        console.log(error)
    }
});

router.get('/best-selling-products/:categoryType', async (req, res) => {
    try {
        const { categoryType } = req.params;

        if (!categoryType) {
            return res.status(400).json({ error: 'Category Type is required' });
        }

        // Find the top 5 products with the highest basePrice
        const products = await ProductModel.find({ categoryType, bestSelling: "true" })
            .sort({ basePrice: -1 }); // Sort in descending order of basePrice
        // .limit(5); // Limit the results to 5

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server error' });
    }
});


// app.get('/get-all-products', async (req, res) => {
//     try {
//         const allProducts = await ProductModel.find();
//         res.json(allProducts);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

router.get('/get-all-products', async (req, res) => {
    try {
        const { page = 1, pageSize = 5, search = '' } = req.query;
        const skip = (page - 1) * pageSize;

        // Use a regular expression to make the search case-insensitive and partial
        const searchRegex = new RegExp(search, 'i');

        const query = {
            $or: [
                { brandName: searchRegex },
                { seriesName: searchRegex },
                { model: searchRegex },
                { variant: searchRegex },
                { bestSelling: searchRegex }
            ],
        };

        const allProducts = await ProductModel.find(query).skip(skip).limit(parseInt(pageSize));
        const totalProducts = await ProductModel.countDocuments(query);

        res.json({
            totalRows: totalProducts,
            data: allProducts,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/products/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;



        const product = await ProductModel.findById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.put('/update-product/:productId', async (req, res) => {
    const { productId } = req.params;
    const updateData = req.body;
    const dynamicFieldsArray = JSON.parse(req.body.dynamicFields);

    try {
        // Find the product by _id
        const existingProduct = await ProductModel.findById(productId);

        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        existingProduct.basePrice = updateData.basePrice;
        existingProduct.variant = updateData.variant;
        existingProduct.brandName = updateData.brandName;
        existingProduct.seriesName = updateData.seriesName;
        existingProduct.categoryType = updateData.categoryType;
        existingProduct.model = updateData.model;
        existingProduct.bestSelling = updateData.bestSelling;
        existingProduct.dynamicFields = dynamicFieldsArray;

        // Save the updated product
        const updatedProduct = await existingProduct.save();

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/update-product-image/:productId', upload2.single('productImage'), async (req, res) => {
    const { productId } = req.params;

    try {
        // Find the product by _id
        const existingProduct = await ProductModel.findById(productId);

        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update the product image only if a new image is provided
        if (req.file) {
            existingProduct.productImage = req.file.originalname;
        }

        // Save the updated product
        const updatedProduct = await existingProduct.save();

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.delete('/delete-product/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        // Find and remove the product by _id
        const deletedProduct = await ProductModel.findByIdAndDelete(productId);

        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/products/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Check for empty Excel data
        if (excelData.length === 0) {
            return res.status(400).json({ error: 'Excel data is empty.' });
        }
        const allHeaders = excelData[0];

        const dynamic = allHeaders.filter((item) => !['_id', 'categoryType', 'brandName', 'seriesName', 'model', 'variant', 'basePrice', 'estimatedPrice', 'productImage', 'bestSelling'].includes(item));

        for (const row of excelData.slice(1)) {
            const uniqueIdentifier = row[0];
            const existingItem = await ProductModel.findOne({ _id: uniqueIdentifier })
            const dynamicOptions = [];
            let i = 10;
            for (let x of dynamic) {
                dynamicOptions.push({
                    optionHeading: x,
                    optionValue: row[i]
                })
                i++;
            }
            if (existingItem) {

                existingItem.categoryType = row[1];
                existingItem.brandName = row[2];
                existingItem.seriesName = row[3];
                existingItem.model = row[4];
                existingItem.variant = row[5];
                existingItem.basePrice = row[6];
                existingItem.estimatedPrice = row[7]
                existingItem.productImage = row[8];
                existingItem.bestSelling = row[9];
                existingItem.dynamicFields = dynamicOptions;

                await existingItem.save();
            } else {
                const newProduct = new ProductModel({
                    categoryType: row[1],
                    brandName: row[2],
                    seriesName: row[3],
                    model: row[4],
                    variant: row[5],
                    basePrice: row[6],
                    estimatedPrice: row[7],
                    productImage: row[8],
                    bestSelling: row[9],
                    dynamicFields: dynamicOptions,
                })
                await newProduct.save();
            }
        }


        res.status(200).json({ message: 'Bulk upload successful' });
    } catch (error) {
        console.error('Error during bulk upload:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

router.get('/api/products/bulk-download/:categoryType', async (req, res) => {
    try {
        // Fetch all products from the database
        const categoryType = req.params.categoryType;
        if (!categoryType) {
            return res.status(400).json({ error: 'Category type is required in the route parameters.' });
        }
        const products = await ProductModel.find({ categoryType });
        // Check if there are any products
        if (products.length === 0) {
            return res.status(404).json({ error: 'No products found for bulk download.' });
        }

        // Create an array to store Excel data
        const excelData = [];

        // Add headers to the Excel data
        const headers = ['_id', 'categoryType', 'brandName', 'seriesName', 'model', 'variant', 'basePrice', 'estimatedPrice', 'productImage', 'bestSelling'];

        // Assuming dynamicFields is an array in each product document
        if (products[0].dynamicFields) {
            products[0].dynamicFields.forEach(dynamicField => {
                headers.push(dynamicField.optionHeading);
            });
        }

        excelData.push(headers);

        // Add product data to the Excel data
        products.forEach(product => {
            const rowData = [product._id.toString(), product.categoryType, product.brandName, product.seriesName, product.model, product.variant, product.basePrice, product.estimatedPrice, product.productImage, product.bestSelling];

            // Add dynamic field values to the row
            if (product.dynamicFields) {
                product.dynamicFields.forEach(dynamicField => {
                    rowData.push(dynamicField.optionValue);
                });
            }

            excelData.push(rowData);
        });

        // Create a worksheet
        const ws = XLSX.utils.aoa_to_sheet(excelData);

        // Create a workbook and add the worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        // Save the workbook to a file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        // Set headers for the response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=bulk_download.xlsx');

        // Send the Excel file as the response
        res.send(excelBuffer);
    } catch (error) {
        console.error('Error during bulk download:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

module.exports = router;