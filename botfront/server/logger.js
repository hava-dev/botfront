import winston, { format } from 'winston';

const { LoggingWinston } = require('@google-cloud/logging-winston');

const allowdKeysApp = ['message', 'level', 'userId', 'fileName', 'methodName', 'url', 'data', 'timestamp', 'callingArgs', 'status', 'error'];

const allowdKeysAudit = ['level', 'message', 'status', 'userId', 'label', 'type', 'timestamp', 'before', 'after'];


const {
    combine, timestamp, printf,
} = format;
 

const spaceBeforeIfExist = prop => (prop ? ` ${prop}` : '');

const auditFormat = printf((arg) => {
    Object.keys(arg).forEach((key) => {
        if (!allowdKeysAudit.includes(key)) throw new Error(`${key} not allowed in audit logs`);
    });
    const {
        level, message, status, userId, label, type, timestamp, before, after,
    } = arg;
    
    let additionalInfo = '';
    if (before) additionalInfo = `before: ${before}`;
    if (after) additionalInfo = additionalInfo.concat(`after: ${after}`);
    return `${timestamp} [${label.toUpperCase()}] ${level}:${userId ? ` userId: ${userId}` : ''}${spaceBeforeIfExist(type)}${spaceBeforeIfExist(status)}${spaceBeforeIfExist(message)}${spaceBeforeIfExist(additionalInfo)}`;
});

const appFormat = printf((arg) => {
    Object.keys(arg).forEach((key) => {
        if (!allowdKeysApp.includes(key)) throw new Error(`${key} not allowed in application logs`);
    });
    return JSON.stringify(arg);
});

const {
    APPLICATION_LOG_LEVEL, APPLICATION_LOG_TRANSPORT, AUDIT_LOG_TRANSPORT, APPLICATION_LOGGER_NAME, AUDIT_LOGGER_NAME,
} = process.env;

const appStackDriver = new LoggingWinston({
    logName: `${APPLICATION_LOGGER_NAME || 'botfront-log-app'}`,
});
 
const auditStackDriver = new LoggingWinston({
    logName: `${AUDIT_LOGGER_NAME || 'botfront-log-audit'}`,
});

let level = 'silly';
if (!!APPLICATION_LOG_LEVEL) {
    level = APPLICATION_LOG_LEVEL;
}

const appLogTransport = [];
if (!!APPLICATION_LOG_TRANSPORT) {
    if (APPLICATION_LOG_TRANSPORT.includes('console')) appLogTransport.push(new winston.transports.Console());
    if (APPLICATION_LOG_TRANSPORT.includes('stackdriver')) appLogTransport.push(appStackDriver);
} else {
    appLogTransport.push(new winston.transports.Console());
}

const auditLogTransport = [];
if (!!AUDIT_LOG_TRANSPORT) {
    if (AUDIT_LOG_TRANSPORT.includes('console')) auditLogTransport.push(new winston.transports.Console());
    if (AUDIT_LOG_TRANSPORT.includes('stackdriver')) auditLogTransport.push(auditStackDriver);
} else {
    auditLogTransport.push(new winston.transports.Console());
}


export const appLogger = winston.createLogger({
    level,
    format: combine(timestamp(), appFormat),
    transports: appLogTransport,
});


export const auditLogger = winston.createLogger({
    level: 'silly',
    format: combine(
        timestamp(),
        auditFormat,
    ),
    transports: auditLogTransport,
});
