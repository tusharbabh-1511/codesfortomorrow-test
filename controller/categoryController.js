const express = require('express');
const categoryRoutes = express.Router();
const db = require('../config/db');

categoryRoutes.put('/', async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
    }

    try {

        const [existingCategory] = await db.execute('SELECT * FROM tbl_category WHERE category_name = ?', [name]);
        if (existingCategory.length > 0) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        const [result] = await db.execute('INSERT INTO tbl_category (category_name) VALUES (?)', [name]);
        if (result.affectedRows === 0) {
            return res.status(500).json({ error: 'Failed to create category' });
        }
        return res.status(201).json({ message: 'Category created successfully' });
    } catch (error) {
        console.log('Error creating category:', error);
        return res.status(500).json({ error: 'Internal server errore' });
    }
});

categoryRoutes.put('/:id', async (req, res) => {

    const { id } = req.params;
    const { name } = req.body;


    if (!id) {
        return res.status(400).json({ error: 'Category id is required' });
    }

    if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
    }

    try {

        const [existingCategory] = await db.execute(
            'SELECT * FROM tbl_category WHERE category_name = ? AND id != ?',
            [name, id]
        );

        if (existingCategory.length > 0) {
            return res.status(400).json({ error: 'category with the same name already exists' });
        }

        const [result] = await db.execute(
            'UPDATE tbl_category SET category_name = ? WHERE id = ?',
            [name, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'no changes made' });
        }

        return res.status(200).json({ message: 'Category updated successfully' });

    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

categoryRoutes.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Category id is required' });
    }

    try {

        const [existingCategoryWithNoService] = await db.execute(
            'SELECT * FROM tbl_category c INNER join tbl_service s on s.category_id = c.id WHERE c.id = ?',
            [id]
        );

        if (existingCategoryWithNoService.length > 0) {
            return res.status(400).json({ error: 'This Category has service' });
        }

        const [result] = await db.execute(
            'DELETE FROM tbl_category WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'no record deleted' });
        }

        return res.status(200).json({ message: 'Category Deleted successfully' });

    } catch (error) {
        console.error('Error Deleteing category:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }


});


categoryRoutes.put('/:id/service', async (req, res) => {

    const { service_name, service_type, price_options } = req.body;
    const { id: category_id } = req.params;

    if (!service_name || !service_type || !Array.isArray(price_options)) {
        return res.status(400).json({ error: 'Missing required fields: service_name, service_type, or price_options array' });
    }

    try {


        const [serviceResult] = await db.execute(
            'INSERT INTO tbl_service (category_id, service_name, service_type) VALUES (?, ?, ?)',
            [category_id, service_name, service_type]
        );

        const service_id = serviceResult.insertId;
        const priceInserts = price_options.map(i => [
            service_id,
            i.duration,
            i.price,
            i.duration_type
        ]);

        await db.query(
            'INSERT INTO tbl_service_price (service_id, duration, price, duration_type) VALUES ?',
            [priceInserts]
        );


        return res.status(201).json({ message: 'Service and price options added successfully' });

    } catch (error) {
        console.error('Error adding service:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

categoryRoutes.get('/:id/services', async (req, res) => {
    const { id: categoryId } = req.params;

    try {

        const [services] = await db.execute(
            'SELECT tbl_service.id, tbl_category.id as category_id,category_name , service_name, service_type FROM tbl_service INNER JOIN tbl_category on tbl_category.id = tbl_service.category_id WHERE category_id = ?',
            [categoryId]
        );

        if (services.length === 0) {
            return res.status(404).json({ message: 'No services found for this category' });
        }

        const serviceIds = services.map(service => service.id);

        const placeholders = serviceIds.map(() => '?').join(',');

        const sql = `SELECT sp.service_id, sp.duration, sp.price, dt.type AS duration_type
                    FROM tbl_service_price sp
                    JOIN tbl_duration_type dt ON sp.duration_type = dt.id
                    WHERE sp.service_id IN (${placeholders})`;

        const [priceOptions] = await db.query(sql, serviceIds);


        const servicesWithPrices = services.map(service => {
            const options = priceOptions.filter(p => p.service_id === service.id);
            return {
                ...service,
                price_options: options.map(opt => ({
                    duration: opt.duration,
                    price: opt.price,
                    duration_type: opt.duration_type
                }))
            };
        });

        return res.status(200).json({msg : "success" , data : servicesWithPrices});

    } catch (error) {
        console.error('Error fetching services:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


categoryRoutes.delete('/:categoryId/service/:serviceId', async (req, res) => {

    const { categoryId, serviceId } = req.params;

    try {

        const [serviceCheck] = await db.execute(
            'SELECT id FROM tbl_service WHERE id = ? AND category_id = ?',
            [serviceId, categoryId]
        );

        if (serviceCheck.length === 0) {
            return res.status(404).json({ error: 'Service not found for this category' });
        }


        await db.execute(
            'DELETE FROM tbl_service_price WHERE service_id = ?',
            [serviceId]
        );

        const [result] = await db.execute(
            'DELETE FROM tbl_service WHERE id = ?',
            [serviceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        return res.status(200).json({ message: 'Service Deleted successfully' });

    } catch (error) {
        console.error('Error deleting service:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

categoryRoutes.put('/:categoryId/service/:serviceId', async (req, res) => {
    const { categoryId, serviceId } = req.params;
    const { service_name, service_type, price_options } = req.body;

    if (!service_name || !service_type || !Array.isArray(price_options)) {
        return res.status(400).json({ error: 'required fields: service_name, service_type, or price_options array' });
    }

    try {
        const [serviceCheck] = await db.execute(
            'SELECT id FROM tbl_service WHERE id = ? AND category_id = ?',
            [serviceId, categoryId]
        );

        if (serviceCheck.length === 0) {
            return res.status(404).json({ error: 'Service not found for this category' });
        }

        await db.execute(
            'UPDATE tbl_service SET service_name = ?, service_type = ? WHERE id = ?',
            [service_name, service_type, serviceId]
        );

        await db.execute(
            'DELETE FROM tbl_service_price WHERE service_id = ?',
            [serviceId]
        );

        const priceInserts = price_options.map(opt => [
            serviceId,
            opt.duration,
            opt.price,
            opt.duration_type
        ]);

        if (priceInserts.length > 0) {
            await db.query(
                'INSERT INTO tbl_service_price (service_id, duration, price, duration_type) VALUES ?',
                [priceInserts]
            );
        }

        return res.status(200).json({ message: 'Service updated successfully' });

    } catch (error) {
        console.error('Error updating service:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});






module.exports = categoryRoutes;
