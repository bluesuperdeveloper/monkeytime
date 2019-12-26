// Validator helper functions for login and user sign-in

const isEmail = (email) =>{
    // eslint-disable-next-line max-len
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;
};

const isEmpty = (string) => {
    if (string.trim()==='') return true;
    else return false;
};

exports.validateSignUpData = (data) => {
    let errors = {};
    if (isEmpty(data.email)) {
        errors.email = 'Must not be empty';
    } else if (!isEmail(data.email)) {
        errors.email = 'Yo, your email aint valid fam';
    }

    if (isEmpty(data.password)) errors.password = 'You aint got a password?';
    if (data.password!== data.confirmPassword) {
        errors.confirmPassword = 'Passwords gotta match bruh';
    }

    if (isEmpty(data.handle)) errors.handle = 'Bruh you aint got a handle??';

    return  {
        errors,
        // If no keys, no error, data valid -> true. Else false
        valid: Object.keys(errors).length === 0 ? true  : false 
    }
}

exports.validateLoginData = (data) => {
    let errors = {};

    if (isEmpty(user.email)) errors.email = 'Must not be empty';
    if (isEmpty(user.password)) errors.password = 'Must not be empty';

    return  {
        errors,
        // If no keys, no error, data valid -> true. Else false
        valid: Object.keys(errors).length === 0 ? true  : false 
    }
}