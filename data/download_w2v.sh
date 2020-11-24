wget http://vectors.nlpl.eu/repository/20/182.zip
unzip 182.zip model.txt -d w2v
head -n50000 ./w2v/model.txt > ./w2v/model.txt.trim