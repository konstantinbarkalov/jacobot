echo ------
echo installing data
cd data
sudo apt install wget
sudo apt install unzip
./download_books.sh
./download_w2v.sh

cd ..

echo ------
echo installing bot
cd bot
npm install
sudo npm install -g forever

cd ..

echo ------
echo converting text to floatDb
cd devUtils/plainTxtToFloatDb
node --max-old-space-size=2048 convert.js

cd ..
cd ..

echo ------
echo all done!