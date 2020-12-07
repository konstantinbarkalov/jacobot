echo ------
echo starting bot via forever
cd bot
forever restart -c "node --max-old-space-size=3072" -o log/jacobot_out.log -e log/jacobot_error.log startJacobot.js
cd ..