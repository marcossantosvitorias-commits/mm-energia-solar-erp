/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const superusers = app.findCollectionByNameOrId("_superusers")
    const record = new Record(superusers)
    
    record.set("email", $os.getenv("PB_SUPERUSER_EMAIL"))
    record.set("password", $os.getenv("PB_SUPERUSER_PASSWORD"))
    
    app.save(record)
})
