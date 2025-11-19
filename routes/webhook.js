const router = require('express').Router();
const getRawBody = require('raw-body');
const webhook_adapter = require('../classes/webhook'); 
const uuid = require('uuid').v4;
const axios = require('axios');
const express = require('express');
const webhooks_save = require('../controllers/webhooks_save');

// Middleware to forward raw request body

router.get('/webhooks', async(req, res) => {
   // Retrieve the list of webhooks
   console.log("Fetching webhooks");
   const webhooks = await webhooks_save.listAdapters();
   console.log("Webhooks retrieved:", webhooks);

   res.json(webhooks);
});

router.post('/webhook', async (req, res) => {
    const { name, description, targets } = req.body;
    console.log(req.body)

    // normalize targets: accept "example.com, example.de" or already an array
    const parsedTargets = typeof targets === 'string'
        ? targets.split(',').map(t => t.trim()).filter(Boolean)
        : Array.isArray(targets)
            ? targets.map(t => String(t).trim()).filter(Boolean)
            : [];
    
    const adapter = await webhooks_save.createAdapter({ name, description, targets: parsedTargets, enabled: true });
    console.log("Adapter created:", adapter);
    // create webhook with the parsed targets array
    /** 
    const newWebhook = new webhook_adapter({
        id,
        name,
        description,
        url: 'http://api.yp-it.de/webhook/' + id,
        targets: parsedTargets,
        enabled: !!enabled
    });

    console.log("Creating new webhook:", newWebhook);
    res.status(201).json({ webhook: newWebhook });
*/
    res.status(201).json({ message: 'Webhook created' });
    //console.log("Creating new webhook:", newWebhook);
});

router.post(
    '/webhook/:id',
    // ✅ Raw-Body NUR hier aktiv
    express.raw({ type: '*/*', limit: '10mb' }),

    async (req, res) => {

        // 1. Adapter laden
        const adapter = await webhooks_save.getAdapter(req.params.id);

        console.log("Adapter found for webhook trigger:", adapter);

        if (!adapter) {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        const targets = adapter.targets || [];
        if (targets.length === 0) {
            return res.status(404).json({ error: 'No targets configured' });
        }

        // 2. Raw Body ist HIER verfügbar
        const rawBody = req.body;      // Buffer (unverändert!)
        const headers = { ...req.headers };


        // Host entfernen (sonst lehnen viele Server ab)
        delete headers['host'];


        console.log("Forwarding raw body to targets...");

        // 3. Forwarding
        await Promise.all(
            targets.map(async (target) => {
                try {
                    console.log(`→ Sending to ${target}`);

                    await axios.post(target, rawBody, {
                        headers,
                        maxBodyLength: Infinity,
                        maxContentLength: Infinity
                    });

                    console.log(`✓ Sent to ${target}`);
                } catch (err) {
                    console.error(`✗ Error sending to ${target}:`, err.message);
                }
            })
        );

        // 4. Antwort
        res.status(200).json({
            message: 'Webhook processed'
        });
    }
);


router.delete('/webhook/:id', async(req, res) => {
    console.log("Deleting webhook with ID:", req.params.id);
    const response = await webhooks_save.deleteAdapter(req.params.id);

    if (response) {
        console.log("Webhook deleted successfully");
        return res.status(204).json({message: 'Webhook deleted'});
    }

    console.error("Failed to delete webhook");
    res.status(500).json({ error: 'Failed to delete webhook' });
});

router.put('/webhook/:id', (req, res) => {   

});


module.exports = router;