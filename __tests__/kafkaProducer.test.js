import {DLKafkaProducerSync} from '../js_kafka/dlabsKafkaClients'
import Kafka from 'node-rdkafka'
import { jest } from '@jest/globals'
const {Producer} = Kafka
jest.setTimeout(5000*100)
describe("tests for kafka producer", () => {
    const getMocksFunctions = (returnValue) => {
        return jest.fn((..._arg) => {
            return returnValue
        })
    }
    const getMocksException = (returnValue) => {
        return jest.fn((..._arg) => {
            throw new Error('error')
        })
    }
    const getMocksPromiseFunctions = (_returnValue) => {
        return jest.fn((...args) => {
            if (args[1] != undefined) {
                return args[1]()
            } else {
                return args[0]()
            }
        })
    }
    const getKafkaProducerMock = (flushMock, initTransactionsMock, beginTransactionMock,
                                  commitTransactionMock, disconnectMock, abortTransactionMock,
                                  connectMock, produceMock) => {
        let KafkaProducerMock = jest.fn().mockImplementation(() => {
            return {
                connect: connectMock,
                flush: flushMock,
                initTransactions: initTransactionsMock,
                beginTransaction: beginTransactionMock,
                commitTransaction: commitTransactionMock,
                disconnect: disconnectMock,
                abortTransaction: abortTransactionMock,
                produce: produceMock,
                on: (_event, cb) => {
                    cb()
                }
            }
        })
        return new KafkaProducerMock()
    }


    it("test should create a kafka producer", async () => {
        const kafkaProducer = new DLKafkaProducerSync('./__tests__/test_kafka.yml')
        expect(kafkaProducer.producer instanceof Producer).toBe(true)
    })
    it("test should produce a kafka message", async () => {
        let initTransactionsMock = getMocksPromiseFunctions()
        let beginTransactionMock = getMocksPromiseFunctions()
        let commitTransactionMock = getMocksPromiseFunctions()
        let disconnectMock = getMocksPromiseFunctions()
        let abortTransactionMock = getMocksPromiseFunctions()
        let connectMock = getMocksPromiseFunctions()
        let produceMock = getMocksFunctions()
        let flushMock = getMocksPromiseFunctions()
        let kafkaProducerMock = await getKafkaProducerMock(flushMock, initTransactionsMock, beginTransactionMock,
            commitTransactionMock, disconnectMock, abortTransactionMock, connectMock, produceMock)
        let createKafkaProducerMock = getMocksFunctions(kafkaProducerMock)
        const kafkaProducer = new DLKafkaProducerSync('./__tests__/test_kafka.yml', createKafkaProducerMock)
        let messages = {
            "test": [{
                "a": "b"
            }]
        }
        await kafkaProducer.produce(messages)
        let asserMocksCalls = (mockCalls) => {
            for (const mockCall of mockCalls) {
                expect(mockCall.mock.calls.length).toBe(1)   
            }
        }
        asserMocksCalls([flushMock, initTransactionsMock, beginTransactionMock, commitTransactionMock, disconnectMock, connectMock, produceMock])
        expect(produceMock.mock.calls[0][0]).toBe('test');
        expect(produceMock.mock.calls[0][2]).toStrictEqual(Buffer.from(JSON.stringify({
            "a": "b"
        })));
    })
    it("test should throw exception if found and abort transaction", async () => {
        let initTransactionsMock = getMocksException()
        let beginTransactionMock = getMocksPromiseFunctions()
        let commitTransactionMock = getMocksPromiseFunctions()
        let disconnectMock = getMocksPromiseFunctions()
        let abortTransactionMock = getMocksPromiseFunctions()
        let connectMock = getMocksPromiseFunctions()
        let produceMock = getMocksFunctions()
        let flushMock = getMocksPromiseFunctions()
        let kafkaProducerMock = await getKafkaProducerMock(flushMock, initTransactionsMock, beginTransactionMock,
            commitTransactionMock, disconnectMock, abortTransactionMock, connectMock, produceMock)
        let createKafkaProducerMock = getMocksFunctions(kafkaProducerMock)
        const kafkaProducer = new DLKafkaProducerSync('./__tests__/test_kafka.yml', createKafkaProducerMock)
        let messages = {
            "test": [{
                "a": "b"
            }]
        }
        await expect(async () => {
            await kafkaProducer.produce(messages)
        }).rejects.toThrow(
			new Error('error')
		);
    })
})