echo ------
echo restarting bot via forever
cd bot
forever stop startJacobot.js
forever restart -c "node --max-old-space-size=3072" -o log/jacobot_out.log -e log/jacobot_error.log startJacobot.js
cd ..