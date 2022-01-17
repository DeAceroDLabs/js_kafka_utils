import {DLKafkaProducerSync} from './dlabsKafkaClients.js'

let dlProducer = new DLKafkaProducerSync('./kafka.yml')

let messages = {
    "test": [{
        "a": "b"
    }]
}
await dlProducer.produce(messages)
