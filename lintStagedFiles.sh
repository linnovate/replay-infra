files=`git diff-index --cached --name-only HEAD | grep .*\\.js$`;

if [ -n "$files" ]; then
	eslint $files;
	exit $?
else
	echo "No JS files in STAGE";
	exit 0;
fi
