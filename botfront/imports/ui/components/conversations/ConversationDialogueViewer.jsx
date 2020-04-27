import React from 'react';
import PropTypes from 'prop-types';
import ReactJson from 'react-json-view';
import moment from 'moment';
import { Comment, Label, Message } from 'semantic-ui-react';

import UserUtteredEventViewer from '../example_editor/UserUtteredEventViewer';
import ExampleUtils from '../utils/ExampleUtils';

import i18n from 'meteor/universe:i18n';


function BotResponse({
    type, text, data, key,
}) {
    if (!text && !data) {
        return null;
    }
    // remove empty attributes
    if (data) Object.keys(data).forEach(key => (data[key] == null) && delete data[key]);

    const dataEmpty = !data || !Object.keys(data).length;
    return (
        <div className='bot-response-message' key={key}>
            {text && <p className='bot-response-text'>{text}</p>}
            {!dataEmpty && <ReactJson className='bot-response-json' src={data} collapsed name={type} />}
        </div>
    );
}

BotResponse.propTypes = {
    type: PropTypes.string.isRequired,
    text: PropTypes.string,
    data: PropTypes.object,
    key: PropTypes.string,
};

BotResponse.defaultProps = {
    text: '',
    data: null,
    key: 'bot-response',
};

function Turn({
    userSays, userId, botResponses, key,
}) {
    if (!userSays && botResponses.length === 0) {
        return null;
    }

    return (
        <Comment key={key}>
            {userSays && ([
                <Comment.Avatar src='/images/avatars/matt.jpg' />,
                <UserUtteredEventViewer
                    event={userSays}
                    author={userId}
                />,
            ])}
            <Comment.Group>
                <Comment>
                    <Comment.Avatar src='/images/avatars/mrbot.png' />
                    <Comment.Content>
                        <Comment.Author as='a'>Bot</Comment.Author>
                        <Comment.Metadata>
                        </Comment.Metadata>
                        <Comment.Text>
                            {botResponses.map((response, index) => (
                                <BotResponse {...response} key={`bot-response-${index}`} />
                            ))}
                        </Comment.Text>
                        <Comment.Actions>
                        </Comment.Actions>
                    </Comment.Content>
                </Comment>
            </Comment.Group>
        </Comment>
    );
}

Turn.propTypes = {
    userSays: PropTypes.object,
    userId: PropTypes.string,
    botResponses: PropTypes.arrayOf(PropTypes.object).isRequired,
    key: PropTypes.string,
};

Turn.defaultProps = {
    userSays: null,
    userId: null,
    key: 'dialogue-turn',
};

function ConversationDialogueViewer({ conversation: { tracker, userId }, mode }) {
    const turns = [];
    let currentTurn = {
        userSays: null,
        botResponses: [],
    };
    tracker.events.forEach((event) => {
        const type = event.event;

        if (type === 'user' && !!event.text) {
            // The text check here is to remove the null userUttered events that are triggered by reminders
            const example = ExampleUtils.fromParseData(event.parse_data);

            if (example.text.startsWith('/')) {
                // TODO: check entity collisions
                example.text = <Label size='small' horizontal>{example.text}</Label>;
            }

            const userSays = {
                example,
                timestamp: moment.unix(event.timestamp),
                confidence: ExampleUtils.getConfidence(event.parse_data),
            };

            if (!currentTurn.userSays && currentTurn.botResponses.length === 0) {
                // First piece of dialogue
                currentTurn.userSays = userSays;
            } else {
                // Finish previous turn and init a new one
                turns.push(currentTurn);
                currentTurn = {
                    userSays,
                    botResponses: [],
                };
            }
        } else if (type === 'bot') {
            currentTurn.botResponses.push({
                type: 'bot_data',
                text: event.text,
                data: event.data,
            });
        } else if (mode === 'debug') {
            // only insert if user has uttered something
            currentTurn.botResponses.push({
                type: 'event',
                data: event,
            });
        }
    });

    if (currentTurn.userSays || currentTurn.botResponses.length !== 0) {
        turns.push(currentTurn);
    }

    return (
        <Comment.Group>
            {turns.length > 0 ? (
                turns.map(({ userSays, botResponses }, index) => (
                    <Turn userSays={userSays} userId={userId} botResponses={botResponses} key={`dialogue-turn-${index}`} />
                ))
            ) : (
                    <Message
                        info
                        icon='warning'
                        header={i18n.__('no_events_to_show')}
                        content={(() => {
                            if (mode !== 'debug') {
                                return i18n.__('debug_for_non_dialogue_events');
                            }

                            return i18n.__('check_json_mode_tracker');
                        })()}
                    />
                )}
        </Comment.Group>
    );
}

ConversationDialogueViewer.propTypes = {
    conversation: PropTypes.object.isRequired,
    mode: PropTypes.string,
};

ConversationDialogueViewer.defaultProps = {
    mode: 'text',
};

export default ConversationDialogueViewer;
