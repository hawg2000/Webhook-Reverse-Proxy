class WebhookAdapter {
    constructor({
        name,
        description,
        url,
        id,
        targets = [],
        enabled = true
    }) {
        this.name = name;
        this.description = description;
        this.url = url;
        this.id = id;
        this.targets = targets;
        this.enabled = enabled;
    }

    getAllWebhooks() {
        return [];
    }

    getTargetsById(id) {
        const webhook = this.getWebhookById(id);
        return webhook ? webhook.targets : [];
    }

    getWebhookById(id) {
        return this.webhooks.find(wh => wh.id === id);
    }
}

module.exports = WebhookAdapter;
