module.exports.currentTime = () => {
    const d = new Date();
    const minuteString = leadingZero(d.getMinutes());
    const secondString = leadingZero(d.getSeconds());
    const hourString = leadingZero(d.getHours());
    return `${hourString}:${minuteString}:${secondString}`;
}

module.exports.randomizeArray = (array) => {
    let i = array.length;
    if(i == 0) return;
    while(--i){
        let j = Math.floor(Math.random()*(i+1));
        let tempi = array[i];
        let tempj = array[j];
        array[i]= tempj;
        array[j]= tempi;
    }
    return array;
}

function leadingZero(number){
    if(number < 10) return "0" + number.toString();
    return number.toString();
}


