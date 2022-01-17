import yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid';
import Kafka from 'node-rdkafka'
import fs from 'fs'
import path from 'path'
const {Producer} = Kafka
// for checking the docs https://blizzard.github.io/node-rdkafka/current/Producer.html
// https://blizzard.github.io/node-rdkafka/current/producer.js.html#line41
let getConfig = (pathToYml) => {
    let configDict;
    try {
        configDict = yaml.load(
            fs.readFileSync(path.resolve('', pathToYml), "utf8")
        );
    } catch (e) {
        throw new Error(e);
    }
    return configDict;
}


let getProducer = (producerConfigfilePath) => {
    let config = getConfig(producerConfigfilePath)
    config['producer']['config']["transactional.id"] = uuidv4()
    return new Producer(config['producer']['config'])
}

class DLKafkaProducer {
    constructor(
        producerConfigfilePath,
        createProducer = getProducer,
        messagesKey = 'DLKafkaProducer',
        waitForBrokerTime = 60
    ){
        this.producerConfigfilePath = producerConfigfilePath
        this.createProducer = createProducer
        this.producer = createProducer(producerConfigfilePath)
        this.messagesKey = messagesKey
        this.waitForBrokerTime = waitForBrokerTime
    }
    flush(){
        this.producer.flush(this.waitForBrokerTime)
    }
    reCreateProducer(){
        this.producer = this.createProducer(this.producerConfigfilePath)
    }
    produce(_kafkaTopicMessages) {
        throw new Error('implement me')
    }
}

class DLKafkaProducerSync extends DLKafkaProducer {

    static _checkForError(resolve, reject, producer) {
        return (err) => {
            if (err) {
                return reject(err)
            }
            return resolve(producer)
        }
    }

    static _getProducerInited (producer) {
        return new Promise((resolve, reject) => {
            producer.initTransactions(DLKafkaProducerSync._checkForError(resolve, reject, producer))
        })
    }

    static _getProducerBeginedTransactions(producer) {
        return new Promise((resolve, reject) => {
            producer.beginTransaction(DLKafkaProducerSync._checkForError(resolve, reject, producer))
        })
    }

    static _getProducerCommited (producer, timeoff) {
        return new Promise((resolve, reject) => {
            producer.commitTransaction(timeoff, DLKafkaProducerSync._checkForError(resolve, reject, producer))
        })
    }

    static _getProducerFlushed(producer, timeoff) {
        return new Promise((resolve, reject) => {
            producer.flush(timeoff, DLKafkaProducerSync._checkForError(resolve, reject, producer))
        })
    }

    static _getProducerClosed(producer) {
        return new Promise((resolve, reject) => {
            producer.disconnect(DLKafkaProducerSync._checkForError(resolve, reject, producer))
        })
    }

    static _getProducerAborted(producer) {
        return new Promise((resolve, reject) => {
            producer.abortTransaction(DLKafkaProducerSync._checkForError(resolve, reject, producer))
        })
    }

    static _getProducerConnected(producer) {
        return new Promise((resolve, reject) => {
            producer.connect(DLKafkaProducerSync._checkForError(resolve, reject, producer))
        })
    }

    async produce(kafkaTopicMessages) {
        return new Promise(async (resolve, reject) => {
            try {
                DLKafkaProducerSync._getProducerConnected(this.producer)
                this.producer.on('ready', async () => {
                    try {
                        await DLKafkaProducerSync._getProducerInited(this.producer)
                        await DLKafkaProducerSync._getProducerBeginedTransactions(this.producer)
                        for (const [topic, messages] of Object.entries(kafkaTopicMessages)) {
                            for(const message of messages) {
                                let messageToSend = Buffer.from(JSON.stringify(message))
                                this.producer.produce(topic, -1, messageToSend, this.messagesKey, Date.now())
                            }
                        }
                        await DLKafkaProducerSync._getProducerCommited(this.producer, this.waitForBrokerTime)
                        await DLKafkaProducerSync._getProducerFlushed(this.producer, this.waitForBrokerTime)
                        await DLKafkaProducerSync._getProducerClosed(this.producer)
                        resolve(true)   
                    } catch (error) {
                        console.log(`error while producing kafka messages ${error}`)
                        reject(error)
                    }
                })
            } catch (error) {
                // TODO check for sub errors like LibrdKafkaError to rebuild the 
                // producer with this.reCreateProducer and retry
                console.log(`couln't send kafka messages: ${error}`)
                await DLKafkaProducerSync._getProducerAborted(this.producer)
                await DLKafkaProducerSync._getProducerClosed(this.producer)
                reject(error)
            }
        })
    }
}

export {
    DLKafkaProducer,
    DLKafkaProducerSync
}
