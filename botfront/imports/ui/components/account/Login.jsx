import React from 'react';
import { Meteor } from 'meteor/meteor';
import { Segment } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import { Link, browserHistory } from 'react-router';
import { withTracker } from 'meteor/react-meteor-data';
import SimpleSchema from 'simpl-schema';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import ReCAPTCHA from 'react-google-recaptcha';
import {
    AutoForm, ErrorsField, SubmitField, TextField,
} from 'uniforms-semantic';
import { wrapMeteorCallback } from '../utils/Errors';
import { GlobalSettings } from '../../../api/globalSettings/globalSettings.collection';

import i18n from 'meteor/universe:i18n';


class LoginComponent extends React.Component {
    loginFormSchema = new SimpleSchema(
        {
            email: {
                type: String,
                regEx: SimpleSchema.RegEx.EmailWithTLD,
            },
            password: { type: String },
        },
        { tracker: Tracker },
    );


    loginFormSchemaBridge = new SimpleSchema2Bridge(this.loginFormSchema)

    constructor(props) {
        super(props);
        Meteor.call('users.checkEmpty', wrapMeteorCallback((err, res) => {
            if (res) {
                browserHistory.push('/setup/welcome');
            }
        }));
        this.state = {
            loggingIn: false,
            loggedOut: !Meteor.userId,
            reCaptcha: null,
        };
    }

    componentDidMount() {
        Meteor.logout(() => this.setState({ loggedOut: true }));
    }

    handleLogin = (loginObject) => {
        this.setState({ loggingIn: true });
        const { email, password } = loginObject;
        Meteor.loginWithPassword(
            { email: email.trim().toLowerCase() },
            password,
            wrapMeteorCallback((err) => {
                this.setState({ loggingIn: false, reCaptcha: null });
                if (this.reCaptchaRef) this.reCaptchaRef.reset();
                if (!err) browserHistory.goBack();
            }),
        );
    };

    onCaptcha = (reCaptcha) => {
        Meteor.call(
            'user.verifyReCaptcha',
            reCaptcha,
            wrapMeteorCallback((err) => {
                if (!err) return this.setState({ reCaptcha });
                return this.reCaptchaRef.reset();
            }),
        );
    };

    render() {
        const reCaptchaRef = (el) => {
            this.reCaptchaRef = el;
        };
        const { loggingIn, reCaptcha, loggedOut } = this.state;
        const { settings: { settings: { public: { reCatpchaSiteKey } = { reCatpchaSiteKey: null } } = {} } = {} } = this.props;
        return (
            <>
                {loggedOut && (
                    <Segment className='account-block'>
                        <AutoForm model={{}} schema={this.loginFormSchemaBridge} onSubmit={this.handleLogin} className='ui large account-form' disabled={loggingIn}>
                            <ErrorsField />
                            <TextField name='email' iconLeft='user' placeholder={i18n.__('email')} type='email' label={null} data-cy='login-field' />
                            <TextField name='password' iconLeft='lock' placeholder={i18n.__('password')} type='password' label={null} data-cy='password-field' />
                            {reCatpchaSiteKey && (
                                <div>
                                    <ReCAPTCHA sitekey={reCatpchaSiteKey} onChange={this.onCaptcha} ref={reCaptchaRef} />
                                    <br />
                                </div>
                            )}
                            <SubmitField value='LOGIN' className='black large basic fluid' disabled={reCatpchaSiteKey && !reCaptcha} data-cy='login-button' />
                            <br />
                            <Link style={{ color: '#000' }} to='/forgot-password'>
                                Forgot your password?
                            </Link>
                        </AutoForm>
                    </Segment>
                )}
            </>
        );
    }
}

LoginComponent.propTypes = {
    route: PropTypes.shape({
        name: PropTypes.string,
        path: PropTypes.string,
    }).isRequired,
    settings: PropTypes.object,
};

LoginComponent.defaultProps = {
    settings: {},
};

const LoginContainer = withTracker(() => {
    Meteor.subscribe('settings');
    const settings = GlobalSettings.findOne({}, { fields: { 'settings.public.reCatpchaSiteKey': 1 } });
    return {
        settings,
    };
})(LoginComponent);
export default LoginContainer;
