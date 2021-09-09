// ==UserScript==
// @name         Aimbot 3.2
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  try to take over the world!
// @author       You
// @match        http://slay.one/beta/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var maxPossibleVictims = 5// from 2 to 24, made for a faster search of a victim (in case the aimbot is lagging for you); e.g. this value is 5 - then only 5 closest players will be considered as possible victims
    var ignoreBots = false; // true or false
    var myWeapons = { // edit weapons which have auto aiming
        "Laser Gun": true,
        "Grenade Launcher": true,
        "Flamethrower": true,
        "Minigun": true,
        "Rocket Launcher": false,
        "Laser Gun R": false,
        "Homing Launcher": false,
        "Remote Controlled Launcher": false,
        "Napalm Grenade Launcher": false,
        "Sniper Rifle": true,
        "Shotgun": true,
        "Rapid Rocket Launcher": false,
        "Rapid Grenade Launcher": true,
        "Zombie Melee": false,
        "Zombie Ranged": false,
        "Zombie Boss Melee": false,
        "Heal Beam": false,
        "Energy Rifle": true,
        "ASMD 2nd Mode": false
    };
    var keyForTargetting = KEY.T // key to target a specific player
    var keyForNotTargetting = KEY.G // no targetting

    var gameTps = 20; // game.tps
    var tickPeriod = 1000 / 20;
    var gameTicks = 0;
    var pingArr = [-1, -1, -1, -1, -1]
    var ticksPerPing// = myPing / tickPeriod
    var specialVictim

    var sniperEye = true
    var victim
    var victimIndex
    var possibleVictims = [] // array of {victim:victim, dist:dist}

    document.body.onmousedown = function (e) {
        if (e.button === 1) {
            sniperEye = !sniperEye;
            //console.log("sniperEye:", sniperEye)

			if(sniperEye){
				game.interface_.setMainKillMsg("Sniper Eye is On", "#8533FF", "textInGreen");
			}else{
				game.interface_.setMainKillMsg("Sniper Eye is Off", "#B15124", "textInRed");
			}
        }
        // return false;
    }

    var defaultHandler = KeyManager.__proto__.handleInput

    KeyManager.__proto__.handleInput = function (key, e) {

        if (key == keyForTargetting) {
            specialVictim = null

            calcVictim(); // find nearest

            specialVictim = victim

            if (specialVictim) {
                //console.log("target:", specialVictim.name)
				game.interface_.setMainKillMsg("Special Victim: " + specialVictim.name, "#78DBE2", "textInGreen");
            } else {
                game.interface_.setMainKillMsg("Can't Find Target", "#DB1D1D", "textInRed");
            }
            return;
        }

        if (key == keyForNotTargetting) {

            specialVictim = null

			game.interface_.setMainKillMsg("No Special Victim", "#FF0033", "textInRed");
            //console.log("no targetting")

            return;
        }

        defaultHandler(key, e);
    }

    getDirectionFromAgle = function (x, y, x2, y2) {
        var angle
        if (iLoveThisWeapon() && victim && !KeyManager.activeAbility) {
            angle = getAngle(x, y, (victim.ripX - game.cameraX) * FIELD_SIZE, (victim.ripY - game.cameraY - ((game.playingPlayer && game.playingPlayer.weapon && game.playingPlayer.weapon.addHeight) ? SHOT_HEIGHT : 0)) * FIELD_SIZE)
            //console.log(angle)
        } else {
            angle = getAngle(x, y, x2, y2);
        }
        var direction = 0;

        if (angle >= Math.PI * 3 / 8 && angle <= Math.PI * 5 / 8)
            direction = 0;
        else if (angle <= -Math.PI * 3 / 8 && angle >= -Math.PI * 5 / 8)
            direction = 4;
        else if (angle >= Math.PI * 7 / 8 || angle <= -Math.PI * 7 / 8)
            direction = 2;
        else if ((angle <= Math.PI * 1 / 8 && angle >= 0) || (angle >= -Math.PI * 1 / 8 && angle <= 0))
            direction = 6;
        else if (angle <= Math.PI * 7 / 8 && angle >= Math.PI * 5 / 8)
            direction = 1;
        else if (angle <= Math.PI * 3 / 8 && angle >= Math.PI * 1 / 8)
            direction = 7;
        else if (angle >= -Math.PI * 7 / 8 && angle <= -Math.PI * 5 / 8)
            direction = 3;
        else
            direction = 5;

        return direction;
    };

    function iLoveThisWeapon() {
        if (!sniperEye) {
            return false
        }
        if (!game.playingPlayer) {
            return false
        }

        if (!game.playingPlayer.weapon) {
            return false
        }

        return myWeapons[game.playingPlayer.weapon.name]
    }

    getMouseGamePlayX = function () {
        if (iLoveThisWeapon() && !KeyManager.activeAbility) {
            calcVictim()

            if (victim && !isNaN(victim.ripX)) {
                //console.log(victim.ripX, victim.ripY)
                //console.log("------------------")

                //KeyManager.x = (victim.ripX - game.cameraX)*FIELD_SIZE

                return victim.ripX
            }

            if (window.KeyManager && window.game) {
                return KeyManager.x / FIELD_SIZE + game.cameraX;
            }
            return 0;

        } else {
            if (window.KeyManager && window.game) {
                return KeyManager.x / FIELD_SIZE + game.cameraX;
            }
            return 0;
        }
    };

    getMouseGamePlayY = function () {
        if (iLoveThisWeapon() && !KeyManager.activeAbility) {
            //calcVictim()

            if (victim && !isNaN(victim.ripY)) {
                //KeyManager.y = (victim.ripY - game.cameraY - ((game.playingPlayer && game.playingPlayer.weapon && game.playingPlayer.weapon.addHeight) ? SHOT_HEIGHT : 0))*FIELD_SIZE

                return victim.ripY
            }

            if (window.KeyManager && window.game) {
                return KeyManager.y / FIELD_SIZE + game.cameraY + ((game.playingPlayer && game.playingPlayer.weapon && game.playingPlayer.weapon.addHeight) ? SHOT_HEIGHT : 0);
            }

            return 0;
        } else {
            if (window.KeyManager && window.game) {
                return KeyManager.y / FIELD_SIZE + game.cameraY + ((game.playingPlayer && game.playingPlayer.weapon && game.playingPlayer.weapon.addHeight) ? SHOT_HEIGHT : 0);
            }

            return 0;
        }
    };

    var calcVictim = function () {

        victim = null;
        possibleVictims = []

        if (specialVictim) {
            specialVictim.dist = 0;
            possibleVictims.push(specialVictim)
        }

        var allBots = true;
        var p
        for (var i = 0; i < game.players.length; i++) {
            p = game.players[i]

            if ((game.playingPlayer !== p) && (p.authLevel > 0)) {
                allBots = false
                break;
            }
        }

        for (i = 0; i < game.players.length; i++) {
            p = game.players[i]
            var dist // rough distance
            if ((game.playingPlayer !== p) && !(!allBots && ignoreBots && (p.authLevel == 0)) && ((p.team == 0) || (p.team != game.playingPlayer.team)) && (p.dieAt == 0)) {

                dist = Math.abs(p.x - game.playingPlayer.x) + Math.abs(p.y - game.playingPlayer.y)

                p.dist = dist
                possibleVictims.push(p)
            }
        }

        possibleVictims.sort(compareDist)

        victimIndex = 0
        victim = possibleVictims[victimIndex]

        //calcSpeeds();
        predictPos()
    }

    var calcSpeeds = function () {
        if (!game) {
            return
        }

        for (var i = 0; i < game.players.length; i++) {
            var p = game.players[i]
            if (p.hasOwnProperty("lastX")) {
                p.deltaX = p.x - p.lastX;
                p.deltaY = p.y - p.lastY;
            } else {
                p.deltaX = 0;
                p.deltaY = 0;
            }
            p.lastX = p.x;
            p.lastY = p.y;
        }


        // calc ping every 1 sec

        if (gameTicks % gameTps === 0) {
            pingArr.shift();
            pingArr[4] = network.lastPing
            pingArr.sort(compareNumbers)// after sorting pingArr[2] is the median value

            ticksPerPing = (pingArr[2] < 0 ? network.lastPing : pingArr[2]) / tickPeriod
        }

        gameTicks++
    }

    var predictPos = function () {
        if (!victim) {
            return
        }

        var vsx = victim.deltaX / tickPeriod
        var vsy = victim.deltaY / tickPeriod

        var me = game.playingPlayer
        if (vsx == 0 && vsy == 0) {
            victim.ripX = victim.x
            victim.ripY = victim.y
        }else{

            var vs2 = Math.pow(vsx, 2) + Math.pow(vsy, 2)
            var vs = Math.sqrt(vs2)



            //console.log(vs);

            var ws = me.weapon.projectileSpeed / tickPeriod // ??

            var distDeltaX = victim.x - me.x;
            var distDeltaY = victim.y - me.y;
            var dist2 = Math.pow(distDeltaX, 2) + Math.pow(distDeltaY, 2)
            var dist = Math.sqrt(dist2) // exact distance


            var ang0 = Math.atan(distDeltaX / distDeltaY)
            var ang1 = Math.atan(victim.deltaX / victim.deltaY)
            var angle = ang0 - ang1

            var cos = Math.cos(angle)

            var a = Math.pow(ws, 2) - vs2
            var b = 2 * vs * dist * cos - vs2 * 2 * ticksPerPing
            var c = -dist2 + 2 * vs * ticksPerPing * dist * cos - vs2 * Math.pow(ticksPerPing, 2)

            var t = (- b + Math.sqrt(Math.pow(b, 2) - 4 * a * c)) / (2 * a)

            //console.log(me, ws,dist2, dist, vsx,vsy, vs2, vs, angle, cos, a,b,c,t)
            victim.ripX = victim.x + vsx * (t + ticksPerPing)
            victim.ripY = victim.y + vsy * (t + ticksPerPing)

        }

        // victim is behind a wall, find another one if possible

        if (behindWall(me, victim.ripX - me.x, victim.ripY - me.y)) {
            victim = null

            if (victimIndex < Math.min(possibleVictims.length, maxPossibleVictims) - 1) {
                victimIndex++
                victim = possibleVictims[victimIndex]

                //console.log()
                predictPos()
            }
        }

        //console.log(possibleVictims)
        //

    }

    var behindWall = function (me, distDeltaX, distDeltaY) {
        // find such step value that we touch a new cell on every step
        var steps = Math.floor(Math.max(Math.abs(distDeltaX), Math.abs(distDeltaY)))// + 1

        if(steps === 0){
            return false
        }
        var stepX = distDeltaX / steps
        var stepY = distDeltaY / steps
        var xx = me.x
        var yy = me.y
        for (var k = 1; k <= steps; k++) {
            xx += stepX
            yy += stepY

            // check for collision with walls (simplified, more exact calculation needed for the grenade launchers)

            //if(k==1){console.log(game.getHeight2(Math.floor(xx), Math.floor(yy)))} // test

            if ((game.playingPlayer.weapon.name === "Grenade Launcher") || (game.playingPlayer.weapon.name === "Rapid Grenade Launcher")) {
                if (game.getHeight2(Math.floor(xx), Math.floor(yy)) > 0.6) {
                    return true
                }
            } else {
                if (game.getHeight2(Math.floor(xx), Math.floor(yy)) >= 0.6) {
                    return true
                }
            }
        }

        return false
    }

    var compareNumbers = function (a, b) {
        return a - b;
    }

    var compareDist = function (a, b) {
        return a.dist - b.dist;
    }

    setInterval(calcSpeeds, tickPeriod)

})();

