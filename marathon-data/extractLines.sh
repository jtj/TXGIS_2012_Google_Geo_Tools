#!/bin/sh

echo Please enter the file name
read fname
echo Please enter the Nth lines that you want to keep
read n

exec<$fname
value=0
while read line
do
    if [ $(( $value % $n )) -eq 0 ] ; then
        echo -e "$line" >> new_file.txt
    fi
        let value=value+1 
done
echo "Check the 'new_file.txt' that has been created in this directory";
